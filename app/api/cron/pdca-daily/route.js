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

  let mirrorWeek = 0, activeSubs = 0, providerTotal = 0, providerPaid = 0;
  try {
    const [{ count: mc }, { count: sc }, { count: pt }, { count: pp }] = await Promise.all([
      sb.from('mirror_sessions').select('id', { count: 'exact', head: true }).gte('created_at', `${monday}T00:00:00Z`),
      sb.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active'),
      sb.from('providers').select('id', { count: 'exact', head: true }),
      sb.from('providers').select('id', { count: 'exact', head: true }).not('stripe_subscription_id', 'is', null),
    ]);
    mirrorWeek = mc || 0; activeSubs = sc || 0; providerTotal = pt || 0; providerPaid = pp || 0;
  } catch (e) { console.error('[pdca-daily] kpi', e.message); }

  // ── 店舗SaaS月次マイルストーン（master.md §0-1・2026-09-11確定・67社 by 2026-12-14） ──
  const milestones = [
    { date: '2026-09-30', target: 5 }, { date: '2026-10-31', target: 22 },
    { date: '2026-11-30', target: 45 }, { date: '2026-12-14', target: 67 },
  ];
  const nextMilestone = milestones.find(m => new Date(m.date) >= new Date(today)) || milestones[milestones.length - 1];

  // ── 直近24hの自動化アクティビティ（回っている証拠。x-post/x-engage/feature-article/belle-articleは2026-08-31〜09-01に停止済のためここでは追跡しない） ──
  let improvedCount = 0;
  const yst = new Date(Date.now() - 24 * 3600000 + 9 * 3600000).toISOString().slice(0, 10);
  try {
    const { count: imp } = await sb.from('features').select('id', { count: 'exact', head: true })
      .or(`body.ilike.%seo-improve:${today}%,body.ilike.%seo-improve:${yst}%`);
    improvedCount = imp || 0;
  } catch (e) { console.error('[pdca-daily] activity', e.message); }

  // ── トレンド（過去分析用・今週7日 vs 先週7日＋累計） ──
  const d7 = new Date(Date.now() - 7 * 86400000).toISOString();
  const d14 = new Date(Date.now() - 14 * 86400000).toISOString();
  const trend = {};
  try {
    const cnt = (tbl, filt) => filt(sb.from(tbl).select('id', { count: 'exact', head: true }));
    const [artTotal, art7, artP7, m7, mP7] = await Promise.all([
      cnt('features', q => q.eq('status', 'published')),
      cnt('features', q => q.eq('status', 'published').gte('published_at', d7)),
      cnt('features', q => q.eq('status', 'published').gte('published_at', d14).lt('published_at', d7)),
      cnt('mirror_sessions', q => q.gte('created_at', d7)),
      cnt('mirror_sessions', q => q.gte('created_at', d14).lt('created_at', d7)),
    ]);
    trend.articlesTotal = artTotal.count || 0;
    trend.articles = { now: art7.count || 0, prev: artP7.count || 0 };
    trend.mirror = { now: m7.count || 0, prev: mP7.count || 0 };
  } catch (e) { console.error('[pdca-daily] trend', e.message); }

  const signals = {
    販売_店舗SaaS: `有料契約${providerPaid}社 / 掲載店舗${providerTotal}社（次のマイルストーン: ${nextMilestone.date}に${nextMilestone.target}社）`,
    集客_SEO: seo.ok ? `表示${seo.impressions}(${seo.impressionsPct}) / クリック${seo.clicks}(${seo.clicksPct}) / 主要KW: ${seo.topQueries.join(', ')}` : `GSC未連携(${seo.error})`,
    並走_Mirror: `今週購入${mirrorWeek}件 / サブスク継続${activeSubs}件`,
  };

  // ── 分析：過去→現状→これから をClaudeが書く ──
  const wow = (t) => t ? `${t.now}（先週${t.prev}）` : '—';
  let board = '';
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 1000, temperature: 0.6,
      messages: [{ role: 'user', content: `Finemeの日次事業レポートの「分析」部分を書く。単なる数字報告ではなく、数字を根拠に過去→現状→これからを語る。
北極星＝3年で年商10億・でお個人年収1億。第一フェーズ＝6ヶ月で月商50万円（達成期限2026-12-14）。
⚠️ 2026-09-02に主エンジンを店舗SaaS有料契約に方針転換済み（旧：Mirror¥780サブスク640人は撤回）。目標は店舗SaaS有料契約67社（月次マイルストーン：09-30=5社/10-31=22社/11-30=45社/12-14=67社）。Mirrorサブスクは「並走」であり主目標ではない。判断軸＝「10億へ効くか・速いか」＋「①継続価値＞②集客」。

【今日(${today})の指標】
- 店舗SaaS: ${signals.販売_店舗SaaS}
- SEO: ${signals.集客_SEO}
- Mirror/サブスク(並走): ${signals.並走_Mirror}

【トレンド（今週7日 vs 先週7日）】
- 記事累計: ${trend.articlesTotal ?? '—'}本 / 今週公開: ${wow(trend.articles)}
- Mirror購入: ${wow(trend.mirror)}

【昨日の自動アクティビティ】既存記事改稿${improvedCount}件 / 自己観測issue:${seo.ok ? 0 : 1}

【毎日自動で回っている施策】seo-improve(既存記事の改稿), provider-log-toolkit-announce(掲載店舗へのツール案内), auto-visited/index-submit/seo-bulk-submit(SEOインデックス系)。店舗SaaS営業そのもの（既存21社への有料転換提案・新規開拓）は自動化されておらず、でお手動が主。

次を簡潔な日本語・HTMLの<p>/<ul>のみで出力：
■過去（ここまでの流れ）… トレンドから何が伸び/停滞しているか2〜3行。憶測でなく数字に基づく
■現状（診断）… 店舗SaaS有料契約67社（12-14期限）に対して今どの局面か、ボトルネックは何か2〜3行
■これからのアクション … 箇条書きで具体的に。各項目に【AI自動】か【要でお】を明記し、優先順に。要でお＝店舗営業・有料転換提案など人間しかできないことを最優先で挙げる。5分で着手できる粒度。
盛らない・データが薄い項目は「まだ0」と正直に。` }],
    });
    board = ((msg.content || []).find(b => b.type === 'text')?.text || '').trim();
  } catch (e) { board = `<p>分析生成失敗: ${e.message}</p>`; }

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const seoStatus = seo.ok ? '✅ 稼働' : '⚠️ 要対応（自己観測が起票済）';
    const milestoneGap = nextMilestone.target - providerPaid;
    const html = `
      <h2 style="color:#111">📊 Fineme 事業日報 ${today}</h2>

      <h3 style="color:#111;margin:18px 0 6px">🧭 分析：過去 → 現状 → これから</h3>
      <div style="background:#f8fafc;border-left:3px solid #c9a84c;padding:8px 16px">${board}</div>

      <h3 style="color:#111;margin:18px 0 6px">🏪 店舗SaaS有料契約（第一フェーズ主エンジン）</h3>
      <table style="border-collapse:collapse;font-size:13px">
        <tr><td style="padding:4px 10px;color:#888">有料契約</td><td style="padding:4px 10px"><b>${providerPaid}社</b> / 掲載店舗${providerTotal}社</td></tr>
        <tr><td style="padding:4px 10px;color:#888">次のマイルストーン</td><td style="padding:4px 10px">${nextMilestone.date}までに${nextMilestone.target}社（残り${milestoneGap > 0 ? milestoneGap : 0}社）</td></tr>
        <tr><td style="padding:4px 10px;color:#888">最終期限</td><td style="padding:4px 10px">2026-12-14 までに67社</td></tr>
      </table>

      <h3 style="color:#111;margin:18px 0 6px">🤖 昨日、自動で回ったこと（直近24h）</h3>
      <table style="border-collapse:collapse;font-size:13px">
        <tr><td style="padding:4px 10px;color:#888">既存記事 自動改稿</td><td style="padding:4px 10px"><b>${improvedCount}件</b></td></tr>
        <tr><td style="padding:4px 10px;color:#888">SEO連携/自己観測</td><td style="padding:4px 10px">${seoStatus}</td></tr>
      </table>
      <p style="color:#999;font-size:12px;margin:4px 0 0">店舗SaaS営業（既存21社の有料転換提案・新規開拓）は自動化されておらず、でお手動が主。</p>

      <h3 style="color:#111;margin:18px 0 6px">📈 並走指標（Mirror・SEO）</h3>
      <table style="border-collapse:collapse;font-size:13px">
        <tr><td style="padding:4px 10px;color:#888">集客SEO</td><td style="padding:4px 10px">${signals.集客_SEO}</td></tr>
        <tr><td style="padding:4px 10px;color:#888">Mirror（並走）</td><td style="padding:4px 10px">${signals.並走_Mirror}</td></tr>
      </table>

      <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">北極星=年商10億・年収1億／第一フェーズ=店舗SaaS有料契約67社（2026-12-14期限）。毎日自動: seo-improve(改稿) / provider-log-toolkit-announce(掲載店舗案内) / auto-visited・index-submit・seo-bulk-submit(SEOインデックス)。</p>`;
    await resend.emails.send({ from: 'Fineme 日報 <noreply@fineme.me>', to: OWNER_EMAIL, subject: `📊 Fineme 事業日報 ${today}｜店舗SaaS有料${providerPaid}社・購入${mirrorWeek}(週)`, html });
  }

  return Response.json({ ok: true, signals, seoConnected: seo.ok });
}
