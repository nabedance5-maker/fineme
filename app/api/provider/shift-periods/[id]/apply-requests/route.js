// POST /api/provider/shift-periods/[id]/apply-requests → 提出された出勤希望を、選んだ(スタッフ,日付)だけ
// 確定シフト(source='manual')として一括適用する。body: { items: [{staff_id, date}] }
// 同じ日の休み希望があるもの・既存コマと重なるものは入れない。労働条件(法定の目安含む)を
// 超えるものは入れず、skippedとして理由付きで返す（自動作成と同じ判定）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { createLoadTracker, effectiveLimits, workingHours } from '@/lib/shift-labor';
import { spanOf } from '@/lib/time-span';
import { loadConditions, loadNeighborEntries } from '@/lib/shift-labor-db';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

async function __POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }
  const { id } = await params;

  const { data: period } = await supabase.from('provider_shift_periods').select('*').eq('id', id).eq('provider_id', provider.id).single();
  if (!period) return Response.json({ error: '期間が見つかりません' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return Response.json({ error: '適用する希望を選んでください' }, { status: 400 });
  const wanted = new Set(items.map(i => `${i?.staff_id}|${i?.date}`));

  const [{ data: requests }, { data: ownEntries }, conditions, neighborEntries] = await Promise.all([
    supabase.from('provider_shift_requests').select('staff_id, date, type, start_time, end_time').eq('period_id', period.id),
    supabase.from('provider_shift_entries').select('staff_id, date, start_time, end_time').eq('period_id', period.id),
    loadConditions(supabase, provider.id),
    loadNeighborEntries(supabase, provider.id, period),
  ]);

  // 本人が出した出勤希望だけを適用する（休み希望のみの人の空き日は希望ではないので適用しない）
  const allRequests = requests || [];
  const offSet = new Set((requests || []).filter(r => r.type === 'off').map(r => `${r.staff_id}|${r.date}`));
  const targets = allRequests
    .filter(r => r.type === 'work' && wanted.has(`${r.staff_id}|${r.date}`) && !offSet.has(`${r.staff_id}|${r.date}`))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const limitsByStaff = {};
  (conditions || []).forEach(c => { limitsByStaff[c.staff_id] = effectiveLimits(c); });
  const tracker = createLoadTracker(limitsByStaff);
  const assigned = {};
  const remember = (e) => {
    tracker.add(e.staff_id, e.date, workingHours(e.start_time, e.end_time));
    { const sp = spanOf(e.start_time, e.end_time); if (sp) (assigned[`${e.staff_id}|${e.date}`] = assigned[`${e.staff_id}|${e.date}`] || []).push(sp); }
  };
  [...neighborEntries, ...(ownEntries || [])].forEach(remember);

  const rows = [];
  const skipped = [];
  let duplicateCount = 0;
  for (const r of targets) {
    const { s, e } = spanOf(r.start_time, r.end_time) || { s: 0, e: 0 };
    if ((assigned[`${r.staff_id}|${r.date}`] || []).some(a => a.s < e && a.e > s)) { duplicateCount++; continue; }
    const reason = tracker.check(r.staff_id, r.date, workingHours(r.start_time, r.end_time));
    if (reason) { skipped.push({ staff_id: r.staff_id, date: r.date, start_time: r.start_time, end_time: r.end_time, reason }); continue; }
    rows.push({ period_id: period.id, staff_id: r.staff_id, date: r.date, start_time: r.start_time, end_time: r.end_time, source: 'manual' });
    remember(r);
  }

  if (rows.length) {
    const { error } = await supabase.from('provider_shift_entries').insert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, appliedCount: rows.length, duplicateCount, skipped });
}

export const POST = withAudit(__POST);
