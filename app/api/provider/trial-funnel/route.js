// GET /api/provider/trial-funnel?from=YYYY-MM-DD&to=YYYY-MM-DD&days=60
// 体験→入会の追跡（でお要望 2026-10-19：hacomono差分 #8）。
// 期間内に体験した（体験メニューの予約をした）お客様ごとに、来店したか、その後 days 日以内に
// 会員プランに入会・回数券を購入・2回目に来店したかを数える。
// 体験の判定：メニュー設定で「体験メニュー」にしたメニューの予約。メニュー名に「体験」「お試し」「トライアル」を
// 含む予約も体験として数える（体験メニューの印を付ける前の予約も拾うため）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { memberAuth } from '@/lib/provider-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const TRIAL_RE = /体験|お試し|トライアル/;
const DAY = 86400000;
const ymd = d => new Date(new Date(d).getTime() + 9 * 3600000).toISOString().slice(0, 10);
const VALID = new Set(['pending', 'approved', 'counter_proposed', 'visited']);

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const pid = a.provider.id;
  const q = new URL(request.url).searchParams;
  const today = ymd(Date.now());
  const to = /^\d{4}-\d{2}-\d{2}$/.test(q.get('to') || '') ? q.get('to') : today;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(q.get('from') || '') ? q.get('from') : ymd(Date.now() - 90 * DAY);
  const days = Math.min(365, Math.max(7, Number(q.get('days')) || 60));

  const [{ data: services }, { data: resv }, { data: mems }, { data: pkgs }, { data: staff }] = await Promise.all([
    supabase.from('provider_services').select('id, name, is_trial').eq('provider_id', pid),
    supabase.from('reservations').select('id, user_id, user_name, service_id, service_name, status, reserved_date, confirmed_date, visited_at, staff_id, created_at')
      .eq('provider_id', pid).not('user_id', 'is', null).gte('created_at', new Date(new Date(`${from}T00:00:00+09:00`).getTime() - 120 * DAY).toISOString()).limit(20000),
    supabase.from('provider_memberships').select('user_id, status, approved_at, created_at').eq('provider_id', pid).in('status', ['active', 'cancelled']),
    supabase.from('customer_packages').select('user_id, created_at').eq('provider_id', pid).not('user_id', 'is', null),
    supabase.from('provider_staff').select('id, name').eq('provider_id', pid),
  ]);
  const trialIds = new Set((services || []).filter(s => s.is_trial).map(s => s.id));
  const isTrial = r => (r.service_id && trialIds.has(r.service_id)) || TRIAL_RE.test(r.service_name || '');
  const dateOf = r => r.confirmed_date || r.reserved_date || ymd(r.created_at);

  // お客様ごとの最初の体験（期間内）
  const firstTrial = {};
  for (const r of resv || []) {
    if (!isTrial(r)) continue;
    const d = dateOf(r);
    if (d < from || d > to) continue;
    const cur = firstTrial[r.user_id];
    // 有効な予約を優先（キャンセル後に取り直した人は取り直した方で数える）
    const better = !cur || (VALID.has(r.status) && !VALID.has(cur.status)) || (VALID.has(r.status) === VALID.has(cur.status) && d < dateOf(cur));
    if (better) firstTrial[r.user_id] = r;
  }
  const staffName = Object.fromEntries((staff || []).map(s => [s.id, s.name]));
  const byUser = (rows, key) => { const m = {}; (rows || []).forEach(x => { (m[x[key]] = m[x[key]] || []).push(x); }); return m; };
  const memBy = byUser(mems, 'user_id'), pkgBy = byUser(pkgs, 'user_id'), resBy = byUser(resv, 'user_id');

  const items = Object.values(firstTrial).map(t => {
    const td = dateOf(t);
    const tTs = new Date(`${td}T00:00:00+09:00`).getTime();
    const within = at => { const x = new Date(at).getTime(); return x >= tTs - DAY && x <= tTs + days * DAY; };
    const mem = (memBy[t.user_id] || []).map(m => m.approved_at || m.created_at).filter(within).sort()[0] || null;
    const pkg = (pkgBy[t.user_id] || []).map(p => p.created_at).filter(within).sort()[0] || null;
    const ret = (resBy[t.user_id] || []).filter(r => r.id !== t.id && r.status === 'visited' && !isTrial(r) && dateOf(r) > td && within(`${dateOf(r)}T12:00:00+09:00`)).map(dateOf).sort()[0] || null;
    const visited = t.status === 'visited';
    const firstConv = [mem, pkg].filter(Boolean).sort()[0] || null;
    const stage = !VALID.has(t.status) ? 'cancelled' : !visited ? (td >= today ? 'upcoming' : 'unconfirmed') : mem ? 'membership' : pkg ? 'package' : ret ? 'returned' : 'not_yet';
    return {
      user_id: t.user_id, name: t.user_name || 'お客様', trial_date: td, menu: t.service_name || '', status: t.status, stage,
      staff_id: t.staff_id || null, staff: t.staff_id ? staffName[t.staff_id] || null : null,
      membership_at: mem, package_at: pkg, returned_on: ret,
      days_to_convert: firstConv ? Math.max(0, Math.floor((new Date(firstConv).getTime() - tTs) / DAY)) : null,
      days_since: Math.round((Date.now() - tTs) / DAY),
    };
  }).sort((x, y) => (x.trial_date < y.trial_date ? 1 : -1));

  const active = items.filter(i => i.stage !== 'cancelled');
  const visited = active.filter(i => i.status === 'visited');
  const conv = visited.filter(i => i.membership_at || i.package_at);
  const summary = {
    applied: items.length, cancelled: items.length - active.length, visited: visited.length,
    membership: visited.filter(i => i.membership_at).length, package: visited.filter(i => i.package_at).length,
    converted: conv.length, returned: visited.filter(i => i.returned_on || i.membership_at || i.package_at).length,
    avg_days: conv.length ? Math.round(conv.reduce((t, i) => t + i.days_to_convert, 0) / conv.length) : null,
  };
  const staffRows = {};
  for (const i of visited) {
    const k = i.staff_id || 'none';
    const r = staffRows[k] || (staffRows[k] = { staff: i.staff || '担当なし', visited: 0, converted: 0 });
    r.visited++; if (i.membership_at || i.package_at) r.converted++;
  }
  return Response.json({
    from, to, days, has_trial_menu: trialIds.size > 0, summary,
    by_staff: Object.values(staffRows).sort((x, y) => y.visited - x.visited),
    items,
  });
}
