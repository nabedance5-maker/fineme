// GET /api/decision-state?token=XXX
// 「自走取締役（Strategist）」が意思決定を発案するための、事業のlive状態を返す機械可読エンドポイント。
// pdca-state が「異常検知（issues）」なのに対し、こちらは「次の一手を決めるための現状＋停滞シグナル＋レバー材料」。
// 戦略ループ（cronのclaude -p）がこれをWebFetchし、ゴール(§0 北極星10億)から逆算して最高レバレッジの一手を選ぶ。
import { getSupabase } from '@/lib/supabase';
import { getGoogleAccessToken, querySearchConsole, dateRange } from '@/lib/gsc';

export const dynamic = 'force-dynamic';

const TOKEN = process.env.PDCA_STATE_TOKEN;
const SUBS_TARGET = 640; // 月商50万 = ¥780 × 約640人継続

function sum(rows, k) { return (rows || []).reduce((a, r) => a + (r[k] || 0), 0); }
function jstDate(offsetDays = 0) { return new Date(Date.now() + 9 * 3600000 - offsetDays * 86400000).toISOString().slice(0, 10); }

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!TOKEN || token !== TOKEN) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const stalled = [];      // 停滞・穴シグナル（発案のネタ元）
  const levers = [];       // 打てそうなレバー材料
  const now = { date: jstDate(0) };

  const sb = getSupabase();

  // ── 商品/販売の現状（Supabase） ──
  try {
    const weekAgo = `${jstDate(7)}T00:00:00Z`;
    const monthAgo = `${jstDate(30)}T00:00:00Z`;
    const [subs, mirrorWeek, mirrorTotal, mirrorMonth, artsPub, artsMonth, xWeek, voices] = await Promise.all([
      sb.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active'),
      sb.from('mirror_sessions').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      sb.from('mirror_sessions').select('id', { count: 'exact', head: true }),
      sb.from('mirror_sessions').select('id', { count: 'exact', head: true }).gte('created_at', monthAgo),
      sb.from('features').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      sb.from('features').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('published_at', monthAgo),
      sb.from('sns_posts').select('id', { count: 'exact', head: true }).eq('channel', 'x').gte('created_at', weekAgo),
      sb.from('mirror_voices').select('id', { count: 'exact', head: true }).then(r => r).catch(() => ({ count: null })),
    ]);
    now.subs = { active: subs.count || 0, target: SUBS_TARGET, gapToTarget: SUBS_TARGET - (subs.count || 0) };
    now.mirror = { purchasesTotal: mirrorTotal.count || 0, purchasesWeek: mirrorWeek.count || 0, purchasesMonth: mirrorMonth.count || 0 };
    now.articles = { published: artsPub.count || 0, last30d: artsMonth.count || 0 };
    now.x = { postsWeek: xWeek.count || 0 };
    now.socialProof = { voices: voices?.count ?? null };

    // 停滞シグナル（商品→販売→集客の順で穴を可視化）
    if ((subs.count || 0) === 0) stalled.push({ area: '商品/継続', sig: '有料サブスク継続者が0人。継続価値(New Me Map)がまだ課金で実証されていない＝最優先の穴。' });
    if ((mirrorMonth.count || 0) === 0) stalled.push({ area: '販売/転換', sig: '直近30日のMirror購入が0件。フロント(¥500)の転換が起きていない＝販売の型/導線/social proofが未検証。' });
    if ((voices?.count ?? 0) === 0) stalled.push({ area: '販売/信頼', sig: 'お客様の声(social proof)が0件。信頼商材で声ゼロは転換の最大の穴。声収集フローを回す価値が高い。' });
    if ((xWeek.count || 0) === 0) stalled.push({ area: '集客/X', sig: '今週のX投稿が0本。集客の増幅器が止まっている。' });

    // レバー材料
    levers.push(`記事は累計${artsPub.count || 0}本・直近30日${artsMonth.count || 0}本（集客であり“商品体験”でもある。質を上げると両方に効く）`);
    levers.push(`サブスク ${subs.count || 0}/${SUBS_TARGET}人（第一フェーズの主エンジン。ここを1人でも動かす施策が最高レバレッジ）`);
  } catch (e) {
    now.dbError = e.message.slice(0, 200);
  }

  // ── 集客SEOの機会（GSC） ──
  try {
    const gtoken = await getGoogleAccessToken();
    const r = dateRange(28);
    const q = await querySearchConsole(gtoken, { ...r, dimensions: ['query'], rowLimit: 12 });
    const opp = (q || [])
      .map(x => ({ q: x.keys?.[0], pos: Math.round(x.position), imp: x.impressions, clicks: x.clicks }))
      .filter(x => x.pos >= 5 && x.pos <= 30 && x.imp >= 5)
      .slice(0, 6);
    now.seo = { connected: true, impressions28d: sum(q, 'impressions'), clicks28d: sum(q, 'clicks'), opportunities: opp };
    if (opp.length) levers.push(`SEO機会クエリ${opp.length}件（順位5-30・表示あり＝改稿/内部リンクで上位化を狙える）: ${opp.map(o => `${o.q}(${o.pos}位)`).join(' / ')}`);
    if ((sum(q, 'clicks') || 0) === 0 && (sum(q, 'impressions') || 0) > 0) stalled.push({ area: '集客/SEO', sig: '表示はあるがクリック0。タイトル/メタ(=販売の型)がクリックを取れていない。' });
  } catch (e) {
    now.seo = { connected: false, error: e.message.slice(0, 160) };
  }

  // ── 直近の戦略課題（pdca-criticの改善キュー＝AIが既に気づいている弱点） ──
  try {
    const { data: iq } = await sb.from('sns_posts').select('text,created_at').eq('channel', 'improvement-queue').order('created_at', { ascending: false }).limit(5);
    now.knownIssues = (iq || []).map(r => r.text).filter(Boolean);
  } catch { now.knownIssues = []; }

  return Response.json({
    ok: true,
    goal: { northStar: '3年で年商10億・でお個人年収1億', phase: '6ヶ月で月商50万（Mirror ¥780サブスク約640人）', order: '商品→販売→集客（穴を塞いでから水を注ぐ）' },
    now, stalled, levers,
    hint: 'この状態からゴールへ最も効く一手を1つ選び、実行可能な意思決定カードにしてでおのGO/no-goを仰ぐこと。集客の微調整に閉じない。',
  });
}
