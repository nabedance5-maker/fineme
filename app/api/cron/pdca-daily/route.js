// GET /api/cron/pdca-daily
// 毎朝、事業全体（集客/販売/商品）のCheck指標を集約し、
// 「今日のPDCAボード」（直近の変化・今日自動で回る改善・でおがやる一手）をメールで届ける。
// = 毎日PDCAが回っている状態の中枢。Schedule: "0 22 * * *"（=JST 7:00）
import Anthropic from '@anthropic-ai/sdk';
import { getSupabase } from '@/lib/supabase';
import { getGoogleAccessToken, querySearchConsole, dateRange } from '@/lib/gsc';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';

function sum(rows, k) { return (rows || []).reduce((a, r) => a + (r[k] || 0), 0); }
function pct(now, prev) { if (!prev) return '—'; const d = Math.round(((now - prev) / prev) * 100); return d >= 0 ? `+${d}%` : `${d}%`; }

async function seoSignals() {
  try {
    const token = await getGoogleAccessToken();
    const thisR = dateRange(7);
    // 先週レンジ
    const end = new Date(thisR.startDate + 'T00:00:00Z'); end.setUTCDate(end.getUTCDate() - 1);
    const start = new Date(end); start.setUTCDate(start.getUTCDate() - 6);
    const f = d => d.toISOString().slice(0, 10);
    const prevR = { startDate: f(start), endDate: f(end) };
    const [tw, pw, movers] = await Promise.all([
      querySearchConsole(token, { ...thisR, dimensions: ['date'], rowLimit: 7 }),
      querySearchConsole(token, { ...prevR, dimensions: ['date'], rowLimit: 7 }),
      querySearchConsole(token, { ...thisR, dimensions: ['query'], rowLimit: 5 }),
    ]);
    return {
      ok: true,
      impressions: sum(tw, 'impressions'), impressionsPct: pct(sum(tw, 'impressions'), sum(pw, 'impressions')),
      clicks: sum(tw, 'clicks'), clicksPct: pct(sum(tw, 'clicks'), sum(pw, 'clicks')),
      topQueries: movers.map(m => `${m.keys?.[0]}(${Math.round(m.position)}位)`),
    };
  } catch (e) { return { ok: false, error: e.message }; }
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getSupabase();
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const monday = (() => { const d = new Date(Date.now() + 9 * 3600000); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); })();

  // ── Check：各領域の指標を集約 ──
  const seo = await seoSignals();

  let mirrorWeek = 0, activeSubs = 0, xPostsWeek = 0, strategy = '';
  try {
    const [{ count: mc }, { count: sc }, { count: xc }, { data: strat }] = await Promise.all([
      sb.from('mirror_sessions').select('id', { count: 'exact', head: true }).gte('created_at', `${monday}T00:00:00Z`),
      sb.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active'),
      sb.from('sns_posts').select('id', { count: 'exact', head: true }).eq('channel', 'x').gte('created_at', `${monday}T00:00:00Z`),
      sb.from('sns_posts').select('text').eq('channel', 'strategy').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    mirrorWeek = mc || 0; activeSubs = sc || 0; xPostsWeek = xc || 0; strategy = strat?.text || '';
  } catch (e) { console.error('[pdca-daily] kpi', e.message); }

  // ── 直近24hの自動化アクティビティ（回っている証拠） ──
  let newArticles = [], improvedCount = 0, xPosts24 = 0, monthCost = null;
  const since = new Date(Date.now() - 24 * 3600000).toISOString();
  const yst = new Date(Date.now() - 24 * 3600000 + 9 * 3600000).toISOString().slice(0, 10);
  try {
    const [{ data: arts }, { count: imp }, { count: xp }, { data: usage }] = await Promise.all([
      sb.from('features').select('title,slug').gte('published_at', since).order('published_at', { ascending: false }),
      sb.from('features').select('id', { count: 'exact', head: true }).or(`body.ilike.%seo-improve:${today}%,body.ilike.%seo-improve:${yst}%`),
      sb.from('sns_posts').select('id', { count: 'exact', head: true }).eq('channel', 'x').gte('created_at', since),
      sb.from('x_api_usage').select('*').eq('month', today.slice(0, 7)).maybeSingle(),
    ]);
    newArticles = arts || []; improvedCount = imp || 0; xPosts24 = xp || 0;
    if (usage) monthCost = (usage.reads * 0.005 + usage.writes_plain * 0.015 + usage.writes_link * 0.20).toFixed(2);
  } catch (e) { console.error('[pdca-daily] activity', e.message); }

  // ── トレンド（過去分析用・今週7日 vs 先週7日＋累計） ──
  const d7 = new Date(Date.now() - 7 * 86400000).toISOString();
  const d14 = new Date(Date.now() - 14 * 86400000).toISOString();
  const trend = {};
  try {
    const cnt = (tbl, filt) => filt(sb.from(tbl).select('id', { count: 'exact', head: true }));
    const [artTotal, art7, artP7, x7, xP7, m7, mP7] = await Promise.all([
      cnt('features', q => q.eq('status', 'published')),
      cnt('features', q => q.eq('status', 'published').gte('published_at', d7)),
      cnt('features', q => q.eq('status', 'published').gte('published_at', d14).lt('published_at', d7)),
      cnt('sns_posts', q => q.eq('channel', 'x').gte('created_at', d7)),
      cnt('sns_posts', q => q.eq('channel', 'x').gte('created_at', d14).lt('created_at', d7)),
      cnt('mirror_sessions', q => q.gte('created_at', d7)),
      cnt('mirror_sessions', q => q.gte('created_at', d14).lt('created_at', d7)),
    ]);
    trend.articlesTotal = artTotal.count || 0;
    trend.articles = { now: art7.count || 0, prev: artP7.count || 0 };
    trend.xPosts = { now: x7.count || 0, prev: xP7.count || 0 };
    trend.mirror = { now: m7.count || 0, prev: mP7.count || 0 };
  } catch (e) { console.error('[pdca-daily] trend', e.message); }

  const signals = {
    集客_SEO: seo.ok ? `表示${seo.impressions}(${seo.impressionsPct}) / クリック${seo.clicks}(${seo.clicksPct}) / 主要KW: ${seo.topQueries.join(', ')}` : `GSC未連携(${seo.error})`,
    集客_X: `今週投稿${xPostsWeek}本 / 現方針: ${strategy ? strategy.slice(0, 80) : '未設定'}`,
    販売_Mirror: `今週購入${mirrorWeek}件`,
    商品_サブスク: `継続${activeSubs}件（目標640）`,
  };

  // ── 分析：過去→現状→これから をClaudeが書く ──
  const wow = (t) => t ? `${t.now}（先週${t.prev}）` : '—';
  let board = '';
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 1000, temperature: 0.6,
      messages: [{ role: 'user', content: `Finemeの日次事業レポートの「分析」部分を書く。単なる数字報告ではなく、数字を根拠に過去→現状→これからを語る。
北極星＝3年で年商10億・でお個人年収1億。通過点＝6ヶ月で月商50万(Mirror¥780サブスク約640人)。現在は利用者ほぼ0の集客フェーズ。判断軸＝「10億へ効くか・速いか」＋「①継続価値＞②集客」。

【今日(${today})の指標】
- SEO: ${signals.集客_SEO}
- X: ${signals.集客_X}
- Mirror購入(今週): ${mirrorWeek}件 / サブスク継続: ${activeSubs}件

【トレンド（今週7日 vs 先週7日）】
- 記事累計: ${trend.articlesTotal ?? '—'}本 / 今週公開: ${wow(trend.articles)}
- X投稿: ${wow(trend.xPosts)}
- Mirror購入: ${wow(trend.mirror)}

【昨日の自動アクティビティ】記事公開${newArticles.length}本 / 既存改稿${improvedCount}件 / X投稿${xPosts24}本 / 自己観測issue:${seo.ok ? 0 : 1}

【毎日自動で回っている施策】feature-article(勝てるクエリで記事量産), seo-improve(改稿), x-post(投稿), x-engage(リプ下書き), 自己観測(issue自動対処)。

次を簡潔な日本語・HTMLの<p>/<ul>のみで出力：
■過去（ここまでの流れ）… トレンドから何が伸び/停滞しているか2〜3行。憶測でなく数字に基づく
■現状（診断）… 北極星10億/通過点50万に対して今どの局面か、ボトルネックは何か2〜3行
■これからのアクション … 箇条書きで具体的に。各項目に【AI自動】か【要でお】を明記し、優先順に。AI自動＝明日以降クロンが自動で回すこと／要でお＝人間しかできないこと(初期設定・不可逆・外部交渉)。5分で着手できる粒度。
盛らない・データが薄い項目は「まだ0」と正直に。` }],
    });
    board = ((msg.content || []).find(b => b.type === 'text')?.text || '').trim();
  } catch (e) { board = `<p>分析生成失敗: ${e.message}</p>`; }

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const articleLines = newArticles.length
      ? newArticles.map(a => `<li><a href="https://www.fineme.me/feature/${a.slug}">${(a.title || a.slug).replace(/</g, '&lt;')}</a></li>`).join('')
      : '<li style="color:#999">なし</li>';
    const seoStatus = seo.ok ? '✅ 稼働' : '⚠️ 要対応（自己観測が起票済）';
    const html = `
      <h2 style="color:#111">📊 Fineme 事業日報 ${today}</h2>

      <h3 style="color:#111;margin:18px 0 6px">🧭 分析：過去 → 現状 → これから</h3>
      <div style="background:#f8fafc;border-left:3px solid #c9a84c;padding:8px 16px">${board}</div>

      <h3 style="color:#111;margin:18px 0 6px">🤖 昨日、自動で回ったこと（直近24h）</h3>
      <table style="border-collapse:collapse;font-size:13px">
        <tr><td style="padding:4px 10px;color:#888">SEO記事 自動公開</td><td style="padding:4px 10px"><b>${newArticles.length}本</b><ul style="margin:4px 0 0;padding-left:18px">${articleLines}</ul></td></tr>
        <tr><td style="padding:4px 10px;color:#888">既存記事 自動改稿</td><td style="padding:4px 10px"><b>${improvedCount}件</b></td></tr>
        <tr><td style="padding:4px 10px;color:#888">X 自動投稿</td><td style="padding:4px 10px"><b>${xPosts24}本</b>（今週計${xPostsWeek}本）</td></tr>
        <tr><td style="padding:4px 10px;color:#888">X API 当月コスト</td><td style="padding:4px 10px">${monthCost !== null ? `$${monthCost}` : '—'} / 上限$18</td></tr>
        <tr><td style="padding:4px 10px;color:#888">SEO連携/自己観測</td><td style="padding:4px 10px">${seoStatus}</td></tr>
      </table>

      <h3 style="color:#111;margin:18px 0 6px">📈 事業指標</h3>
      <table style="border-collapse:collapse;font-size:13px">
        <tr><td style="padding:4px 10px;color:#888">集客SEO</td><td style="padding:4px 10px">${signals.集客_SEO}</td></tr>
        <tr><td style="padding:4px 10px;color:#888">集客X</td><td style="padding:4px 10px">${signals.集客_X}</td></tr>
        <tr><td style="padding:4px 10px;color:#888">販売Mirror</td><td style="padding:4px 10px">${signals.販売_Mirror}</td></tr>
        <tr><td style="padding:4px 10px;color:#888">商品サブスク</td><td style="padding:4px 10px">${signals.商品_サブスク}</td></tr>
      </table>
      <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">北極星=年商10億・年収1億／通過点=月商50万。毎日自動: feature-article(勝てるクエリで記事) / seo-improve(改稿) / x-post(投稿) / x-engage(リプ下書き) / 自己観測(issue自動対処)。</p>`;
    await resend.emails.send({ from: 'Fineme 日報 <noreply@fineme.me>', to: OWNER_EMAIL, subject: `📊 Fineme 事業日報 ${today}｜記事${newArticles.length}・X${xPosts24}・購入${mirrorWeek}(週)`, html });
  }

  return Response.json({ ok: true, signals, seoConnected: seo.ok });
}
