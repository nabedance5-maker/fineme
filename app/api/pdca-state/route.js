// GET /api/pdca-state?token=XXX
// 事業全体のPDCA状態（集客SEO/X・販売Mirror・商品サブスク）と未解決の課題(issues)をJSONで返す。
// 自走flow（ローカルの毎日Claude）がこれを読んで「AIが自分で結果を見に行く」ための入口。
// メールではなくAIが読む→判断→対処するための機械可読エンドポイント。
import { getSupabase } from '@/lib/supabase';
import { getGoogleAccessToken, querySearchConsole, dateRange } from '@/lib/gsc';

export const dynamic = 'force-dynamic';

const TOKEN = process.env.PDCA_STATE_TOKEN;

function sum(rows, k) { return (rows || []).reduce((a, r) => a + (r[k] || 0), 0); }

export async function GET(request) {
  const token = new URL(request.url).searchParams.get('token');
  if (!TOKEN || token !== TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const issues = [];          // AIが対処すべき課題（needs_human=人間必須）
  const state = { date: new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10) };

  // ── 集客SEO ──
  try {
    const gtoken = await getGoogleAccessToken();
    const r = dateRange(7);
    const [tw, q] = await Promise.all([
      querySearchConsole(gtoken, { ...r, dimensions: ['date'], rowLimit: 7 }),
      querySearchConsole(gtoken, { ...r, dimensions: ['query'], rowLimit: 8 }),
    ]);
    state.seo = {
      connected: true,
      impressions: sum(tw, 'impressions'),
      clicks: sum(tw, 'clicks'),
      topQueries: q.map(x => ({ q: x.keys?.[0], pos: Math.round(x.position), imp: x.impressions, clicks: x.clicks })),
    };
  } catch (e) {
    state.seo = { connected: false, error: e.message.slice(0, 200) };
    const disabled = /SERVICE_DISABLED|has not been used|accessNotConfigured/.test(e.message);
    const noPerm = /sufficient permission|permission for site/.test(e.message);
    issues.push({
      id: 'seo-gsc-disconnected',
      area: '集客SEO',
      severity: 'blocker',
      needs_human: true,
      title: disabled ? 'Google Search Console API が無効（要有効化）'
        : noPerm ? 'サービスアカウントがSearch Console未登録（要ユーザー追加）'
        : 'GSC連携エラー',
      action_for_human: disabled
        ? 'https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=97876395107 で「有効にする」を押す（1回）'
        : noPerm
        ? 'Google Search Console → プロパティ fineme.me → 設定 → ユーザーと権限 → 「ユーザーを追加」→ サービスアカウントのメール(GOOGLE_SERVICE_ACCOUNT_EMAILの値)を権限「フル」で追加'
        : 'GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY をVercelで確認',
      detail: e.message.slice(0, 300),
    });
  }

  // ── 販売/商品/集客X（Supabase） ──
  try {
    const sb = getSupabase();
    const d = new Date(Date.now() + 9 * 3600000);
    const monday = (() => { const m = new Date(d); m.setUTCDate(m.getUTCDate() - ((m.getUTCDay() + 6) % 7)); return m.toISOString().slice(0, 10); })();
    const [{ count: mc }, { count: sc }, { count: xc }, { data: strat }] = await Promise.all([
      sb.from('mirror_sessions').select('id', { count: 'exact', head: true }).gte('created_at', `${monday}T00:00:00Z`),
      sb.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active'),
      sb.from('sns_posts').select('id', { count: 'exact', head: true }).eq('channel', 'x').gte('created_at', `${monday}T00:00:00Z`),
      sb.from('sns_posts').select('text,created_at').eq('channel', 'strategy').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    state.mirror = { weekPurchases: mc || 0 };
    state.subs = { active: sc || 0, target: 640 };
    state.x = { weekPosts: xc || 0, strategyUpdatedAt: strat?.created_at || null, hasStrategy: !!strat?.text };
    if ((xc || 0) === 0) issues.push({ id: 'x-no-posts', area: '集客X', severity: 'warn', needs_human: false, title: '今週のX投稿が0本（x-post稼働確認）', action_for_ai: 'x-post cronの稼働・エラーを確認' });
  } catch (e) {
    state.dbError = e.message.slice(0, 200);
    issues.push({ id: 'db-error', area: '基盤', severity: 'blocker', needs_human: false, title: 'Supabase取得エラー', detail: e.message.slice(0, 200) });
  }

  return Response.json({ ok: true, state, issues, openBlockers: issues.filter(i => i.severity === 'blocker').length });
}
