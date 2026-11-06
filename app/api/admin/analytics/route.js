// GET /api/admin/analytics?range=today|7d|30d|90d → 運営管理画面のアナリティクス（admin専用）
// 渡邉指摘 2026-11-06：「データが全く入っていない。自動でリアルタイムでデータが入るものじゃなきゃ意味がない」。
// 閲覧は site_page_views（app/_components/PageViewTracker.js → /api/track が自動で記録）、
// 成果（会員登録・Me Scan・Mirror・予約など）は各テーブルから、その場で数える。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const ADMIN_KEY = process.env.ADMIN_API_KEY || '';
const checkAdmin = req => { const k = req.headers.get('x-admin-key'); return !!ADMIN_KEY && k === ADMIN_KEY; };

const JST = 9 * 3600 * 1000;
const jstDay = d => new Date(new Date(d).getTime() + JST).toISOString().slice(0, 10);
const jstHour = d => new Date(new Date(d).getTime() + JST).getUTCHours();

function rangeStart(range) {
  const todayJst = jstDay(Date.now());
  const days = { today: 0, '7d': 6, '30d': 29, '90d': 89 }[range] ?? 6;
  const start = new Date(`${todayJst}T00:00:00+09:00`);
  start.setUTCDate(start.getUTCDate() - days);
  return { start, days };
}

const SECTION_LABEL = { top: 'トップ', fineme: 'Fineme', belle: 'Belle', feature: '記事（Fineme）', journal: '記事（Belle）', diagnosis: 'Me Scan', mirror: 'Mirror', provider_page: '店舗ページ', mypage: 'マイページ', business: '契約者向け・営業', other: 'その他' };

async function loadViews(since) {
  const rows = [];
  for (let from = 0; from < 200000; from += 1000) {
    const { data, error } = await supabase.from('site_page_views')
      .select('created_at, path, section, referrer_host, utm_source, utm_medium, utm_campaign, visitor_id, session_id, device')
      .gte('created_at', since.toISOString()).order('created_at', { ascending: true }).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function countSince(table, col, since, extra) {
  let q = supabase.from(table).select('*', { count: 'exact', head: true }).gte(col, since.toISOString());
  if (extra) q = extra(q);
  const { count, error } = await q;
  return error ? null : count || 0;
}

const top = (map, n = 15) => Object.entries(map).sort((a, b) => b[1].views - a[1].views).slice(0, n).map(([key, v]) => ({ key, views: v.views, visitors: v.visitors.size }));
function bump(map, key, visitor) {
  if (!key) return;
  const e = map[key] || (map[key] = { views: 0, visitors: new Set() });
  e.views += 1;
  if (visitor) e.visitors.add(visitor);
}

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const range = new URL(request.url).searchParams.get('range') || '7d';
  const { start, days } = rangeStart(range);

  let views;
  try { views = await loadViews(start); } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }

  const now = Date.now();
  const visitors = new Set(); const sessions = new Set();
  const pages = {}; const refs = {}; const utms = {}; const sections = {}; const devices = {}; const landings = {};
  const sessionFirst = new Map();
  const series = {};
  for (const v of views) {
    if (v.visitor_id) visitors.add(v.visitor_id);
    if (v.session_id) sessions.add(v.session_id);
    bump(pages, v.path, v.visitor_id);
    bump(refs, v.referrer_host || '（直接・不明）', v.visitor_id);
    if (v.utm_source) bump(utms, [v.utm_source, v.utm_medium, v.utm_campaign].filter(Boolean).join(' / '), v.visitor_id);
    bump(sections, SECTION_LABEL[v.section] || v.section || 'その他', v.visitor_id);
    bump(devices, v.device === 'mobile' ? 'スマホ' : 'パソコン', v.visitor_id);
    if (v.session_id && !sessionFirst.has(v.session_id)) { sessionFirst.set(v.session_id, true); bump(landings, v.path, v.visitor_id); }
    const k = range === 'today' ? String(jstHour(v.created_at)) : jstDay(v.created_at);
    const s = series[k] || (series[k] = { views: 0, visitors: new Set() });
    s.views += 1; if (v.visitor_id) s.visitors.add(v.visitor_id);
  }
  // 時系列（データの無い時間・日も0で並べる）
  const keys = [];
  if (range === 'today') for (let h = 0; h < 24; h++) keys.push(String(h));
  else for (let i = 0; i <= days; i++) { const d = new Date(start); d.setUTCDate(d.getUTCDate() + i); keys.push(jstDay(d)); }
  const timeline = keys.map(k => ({ key: k, views: series[k]?.views || 0, visitors: series[k]?.visitors.size || 0 }));

  // リアルタイム：直近5分の訪問者、直近の閲覧
  const live = views.filter(v => now - new Date(v.created_at).getTime() <= 5 * 60 * 1000);
  const recent = views.slice(-25).reverse().map(v => ({ at: v.created_at, path: v.path, section: SECTION_LABEL[v.section] || v.section, referrer: v.referrer_host, device: v.device }));

  // 成果（期間内の件数）
  const [signups, scans, mirrorPaid, inquiries, reservations, logs, memberships] = await Promise.all([
    countSince('profiles', 'created_at', start),
    countSince('diagnosis_results', 'created_at', start),
    countSince('mirror_sessions', 'created_at', start, q => q.eq('paid', true)),
    countSince('provider_inquiries', 'created_at', start),
    countSince('reservations', 'created_at', start),
    countSince('user_service_logs', 'created_at', start),
    countSince('provider_memberships', 'approved_at', start),
  ]);

  return Response.json({
    range, since: start.toISOString(), generated_at: new Date().toISOString(),
    totals: { views: views.length, visitors: visitors.size, sessions: sessions.size, pages_per_session: sessions.size ? Math.round((views.length / sessions.size) * 10) / 10 : 0 },
    live: { visitors: new Set(live.map(v => v.visitor_id).filter(Boolean)).size, views: live.length },
    timeline,
    pages: top(pages), landings: top(landings, 10), referrers: top(refs, 10), utms: top(utms, 10), sections: top(sections, 12), devices: top(devices, 3),
    recent,
    outcomes: [
      { label: '会員登録', value: signups },
      { label: 'Me Scan の結果', value: scans },
      { label: 'Mirror の購入', value: mirrorPaid },
      { label: '契約者へのお問い合わせ', value: inquiries },
      { label: '店舗への予約', value: reservations },
      { label: 'New Me Log の記録', value: logs },
      { label: '月額プランの入会', value: memberships },
    ],
    tracking_started: views.length === 0 ? '閲覧の記録は 2026-11-06 から始まりました。以降のアクセスが自動で記録されます。' : null,
  });
}
