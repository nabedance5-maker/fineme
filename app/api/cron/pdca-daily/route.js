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

  const signals = {
    集客_SEO: seo.ok ? `表示${seo.impressions}(${seo.impressionsPct}) / クリック${seo.clicks}(${seo.clicksPct}) / 主要KW: ${seo.topQueries.join(', ')}` : `GSC未連携(${seo.error})`,
    集客_X: `今週投稿${xPostsWeek}本 / 現方針: ${strategy ? strategy.slice(0, 80) : '未設定'}`,
    販売_Mirror: `今週購入${mirrorWeek}件`,
    商品_サブスク: `継続${activeSubs}件（目標640）`,
  };

  // ── Act提案：今日の一手をClaudeが決める ──
  let board = '';
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', max_tokens: 700, temperature: 0.6,
      messages: [{ role: 'user', content: `Finemeの日次PDCAボードを作る。第一フェーズ=月商50万(Mirror¥780サブスク640人)。現在は利用者ほぼ0の集客フェーズ。判断軸=①継続価値 ②集客。

今日(${today})の指標:
- 集客SEO: ${signals.集客_SEO}
- 集客X: ${signals.集客_X}
- 販売Mirror: ${signals.販売_Mirror}
- 商品サブスク: ${signals.商品_サブスク}

自動で毎日回っている改善: seo-improve(毎日・惜しいページ自動改稿), x-post(毎日投稿), x-engage(毎日リプ下書き)。

次を簡潔な日本語で出力(HTMLの<p>/<ul>のみ):
■今日の所見(直近の変化・良し悪しを2〜3行)
■今日の一手(でお/人間がやるべき最重要アクション1つ・具体・5分で着手できる粒度)
■観測(明日見るべき数字1つ)
盛らない。データが薄い項目は正直に「まだ0」と書く。` }],
    });
    board = ((msg.content || []).find(b => b.type === 'text')?.text || '').trim();
  } catch (e) { board = `<p>ボード生成失敗: ${e.message}</p>`; }

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = `
      <h2 style="color:#111">🔁 Fineme 日次PDCAボード ${today}</h2>
      <table style="border-collapse:collapse;font-size:13px;margin:12px 0">
        <tr><td style="padding:4px 10px;color:#888">集客SEO</td><td style="padding:4px 10px">${signals.集客_SEO}</td></tr>
        <tr><td style="padding:4px 10px;color:#888">集客X</td><td style="padding:4px 10px">${signals.集客_X}</td></tr>
        <tr><td style="padding:4px 10px;color:#888">販売Mirror</td><td style="padding:4px 10px">${signals.販売_Mirror}</td></tr>
        <tr><td style="padding:4px 10px;color:#888">商品サブスク</td><td style="padding:4px 10px">${signals.商品_サブスク}</td></tr>
      </table>
      ${board}
      <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
      <p style="color:#999;font-size:12px">毎日自動: seo-improve(改稿) / x-post(投稿) / x-engage(リプ下書き)。このボードは毎朝の観測＋今日の一手。</p>`;
    await resend.emails.send({ from: 'Fineme PDCA <noreply@fineme.me>', to: OWNER_EMAIL, subject: `🔁 日次PDCA ${today} — 今日の一手`, html });
  }

  return Response.json({ ok: true, signals, seoConnected: seo.ok });
}
