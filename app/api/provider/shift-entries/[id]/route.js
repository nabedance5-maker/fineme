// PATCH  /api/provider/shift-entries/[id] → 1コマ編集（時間変更等）
// DELETE /api/provider/shift-entries/[id] → 1コマ削除
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
import { reservationsOutsideShift, outsideMessage } from '@/lib/shift-reservation-guard';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

// このシフトのコマが自店舗のものか（2026-10-27：シフトはお店＋日付で持つ）
async function assertOwnEntry(providerId, entryId) {
  const { data } = await supabase.from('provider_shift_entries').select('id, staff_id, date, start_time, end_time').eq('id', entryId).eq('provider_id', providerId).maybeSingle();
  return data || null;
}

// このコマを外す・変えた後に、担当の予約が勤務時間の外にはみ出すか（force で確かめた上で進める。2026-11-09）
async function uncovered(providerId, entry, after) {
  const { data: others } = await supabase.from('provider_shift_entries').select('id, start_time, end_time')
    .eq('provider_id', providerId).eq('staff_id', entry.staff_id).eq('date', entry.date).neq('id', entry.id);
  const remaining = [...(others || []), ...(after && after.staff_id === entry.staff_id && after.date === entry.date ? [after] : [])];
  return reservationsOutsideShift(supabase, { providerId, staffId: entry.staff_id, date: entry.date, remaining });
}

async function __PATCH(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }
  const entry = await assertOwnEntry(provider.id, params.id);
  if (!entry) return Response.json({ error: 'シフトが見つかりません' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const update = { updated_at: new Date().toISOString(), source: 'manual' };
  if (body.staff_id) update.staff_id = body.staff_id;
  if (body.date) update.date = body.date;
  if (body.start_time) update.start_time = body.start_time;
  if (body.end_time) update.end_time = body.end_time;
  if (!body.force) {
    const after = { staff_id: update.staff_id || entry.staff_id, date: update.date || entry.date, start_time: update.start_time || entry.start_time, end_time: update.end_time || entry.end_time };
    const out = await uncovered(provider.id, entry, after);
    if (out.length) return Response.json({ error: outsideMessage(out), reservations: out, needs_force: true }, { status: 409 });
  }

  const { data, error } = await supabase.from('provider_shift_entries').update(update).eq('id', params.id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}

async function __DELETE(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }
  const entry = await assertOwnEntry(provider.id, params.id);
  if (!entry) return Response.json({ error: 'シフトが見つかりません' }, { status: 404 });
  if (new URL(request.url).searchParams.get('force') !== '1') {
    const out = await uncovered(provider.id, entry, null);
    if (out.length) return Response.json({ error: outsideMessage(out), reservations: out, needs_force: true }, { status: 409 });
  }

  const { error } = await supabase.from('provider_shift_entries').delete().eq('id', params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
