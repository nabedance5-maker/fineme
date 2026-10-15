// GET /api/provider/service-memos/metrics?days=90 → 接客の効果（認証済み）
//
// 1) 会計時の次回予約率：来店した予約のうち、来店当日〜翌日に次の予約が入った割合
//    （その日の会計時に次回を押さえられたか。来店当日〜翌日に作られた、来店日より後の予約で判定）
// 2) 2回目来店率：初来店が30〜180日前のお客様のうち、2回目に来店した割合
// どちらも店舗全体と、担当スタッフ別（来店予約の staff_id）で返す。
// 判定の母数は予約（reservations）。会員はuser_id、非会員は名前で同一人物とみなす。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { ACTIVE_STATUSES, addDays, effDate, customerKey, jstDateOf, jstToday } from '@/lib/service-memo';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const PAGE = 1000;
const MAX_ROWS = 20000;

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

async function fetchAllReservations(providerId, since) {
  const rows = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase
      .from('reservations')
      .select('id, user_id, user_name, status, staff_id, reserved_date, confirmed_date, counter_date, created_at')
      .eq('provider_id', providerId)
      .in('status', ACTIVE_STATUSES)
      .gte('reserved_date', since)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

function bucket(map, key) {
  return (map[key] ||= { n: 0, hit: 0 });
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const days = Math.min(365, Math.max(14, Number(new URL(request.url).searchParams.get('days')) || 90));
  const today = jstToday();

  let rows;
  try {
    // 初来店の判定のため、集計期間より1年ほど前まで遡って取る
    rows = await fetchAllReservations(provider.id, addDays(today, -Math.max(days, 180) - 365));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
  const { data: staffRows } = await supabase.from('provider_staff').select('id, name').eq('provider_id', provider.id);
  const staffName = Object.fromEntries((staffRows || []).map(s => [s.id, s.name]));

  const byKey = {};
  rows.forEach(r => {
    const k = customerKey(r);
    if (!k) return;
    r._date = effDate(r);
    r._created = jstDateOf(r.created_at);
    (byKey[k] ||= []).push(r);
  });
  Object.values(byKey).forEach(list => list.sort((a, b) => a._date.localeCompare(b._date)));

  // 1) 会計時の次回予約率（判定が終わっている昨日までの来店を対象）
  const windowStart = addDays(today, -days);
  const yesterday = addDays(today, -1);
  const rebookAll = { n: 0, hit: 0 };
  const rebookByStaff = {};
  // 2) 2回目来店率
  const cohortStart = addDays(today, -180);
  const cohortEnd = addDays(today, -30);
  const returnAll = { n: 0, hit: 0 };
  const returnByStaff = {};

  Object.values(byKey).forEach(list => {
    const visits = list.filter(r => r.status === 'visited');
    visits.forEach(v => {
      if (v._date < windowStart || v._date > yesterday) return;
      const hit = list.some(o => o.id !== v.id && o._date > v._date && o._created && o._created >= v._date && o._created <= addDays(v._date, 1));
      const sk = v.staff_id || 'none';
      rebookAll.n++; bucket(rebookByStaff, sk).n++;
      if (hit) { rebookAll.hit++; bucket(rebookByStaff, sk).hit++; }
    });

    const first = visits[0];
    if (first && first._date >= cohortStart && first._date <= cohortEnd) {
      const returned = visits.length >= 2;
      const sk = first.staff_id || 'none';
      returnAll.n++; bucket(returnByStaff, sk).n++;
      if (returned) { returnAll.hit++; bucket(returnByStaff, sk).hit++; }
    }
  });

  const rate = b => (b.n ? Math.round((b.hit / b.n) * 1000) / 10 : null);
  const staffKeys = [...new Set([...Object.keys(rebookByStaff), ...Object.keys(returnByStaff)])];
  const staff = staffKeys.map(k => ({
    staff_id: k === 'none' ? null : k,
    name: k === 'none' ? '担当なし' : staffName[k] || '（削除済みスタッフ）',
    rebook: { ...(rebookByStaff[k] || { n: 0, hit: 0 }), rate: rate(rebookByStaff[k] || { n: 0 }) },
    secondVisit: { ...(returnByStaff[k] || { n: 0, hit: 0 }), rate: rate(returnByStaff[k] || { n: 0 }) },
  })).sort((a, b) => (a.staff_id ? 0 : 1) - (b.staff_id ? 0 : 1) || (b.rebook.n - a.rebook.n));

  return Response.json({
    days,
    rebook: { ...rebookAll, rate: rate(rebookAll), from: windowStart, to: yesterday },
    secondVisit: { ...returnAll, rate: rate(returnAll), from: cohortStart, to: cohortEnd },
    staff,
  });
}
