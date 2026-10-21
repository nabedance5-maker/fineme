// PATCH  /api/provider/classes/[id]/sessions/[sessionId] → 締切/再開・定員変更
// DELETE /api/provider/classes/[id]/sessions/[sessionId] → 開催回を削除（予約中のお客様がいる場合は拒否）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
import { lessonConflict } from '@/lib/availability-engine';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const OCCUPYING_STATUSES = ['pending', 'approved', 'counter_proposed', 'visited'];

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

async function __PATCH(request, { params }) {
  const { id, sessionId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'class_management'); if (locked) return locked; }

  const body = await request.json().catch(() => ({}));
  const update = {};
  if ('is_open' in body) update.is_open = !!body.is_open;
  if ('capacity' in body) update.capacity = Number(body.capacity) || 1;
  if ('start_time' in body) update.start_time = body.start_time;
  if ('end_time' in body) update.end_time = body.end_time;
  // 日付の変更（でお要望 2026-10-21：クラスの編集画面で開催日時を変えられるように）
  if ('date' in body) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date || ''))) return Response.json({ error: '日付が正しくありません' }, { status: 400 });
    update.date = body.date;
  }
  if ((update.start_time && update.end_time && update.start_time >= update.end_time)) return Response.json({ error: '終了時刻は開始時刻より後にしてください' }, { status: 400 });
  // 予約が入っている回の日時を動かすと、お客様の予約の日時とずれるため変えられない
  if ('date' in update || 'start_time' in update || 'end_time' in update) {
    const { data: cur } = await supabase.from('provider_slots').select('date, start_time, end_time').eq('id', sessionId).eq('provider_id', provider.id).eq('class_id', id).maybeSingle();
    const changed = cur && (('date' in update && update.date !== cur.date) || ('start_time' in update && update.start_time.slice(0, 5) !== String(cur.start_time).slice(0, 5)) || ('end_time' in update && update.end_time.slice(0, 5) !== String(cur.end_time).slice(0, 5)));
    if (changed) {
      const { data: booked } = await supabase.from('reservations').select('id').eq('slot_id', sessionId).in('status', OCCUPYING_STATUSES).limit(1);
      if (booked?.length) return Response.json({ error: '予約中のお客様がいるため、日時は変えられません。新しい日時の回を追加して、お客様にご案内してください' }, { status: 409 });
    }
  }

  // 日時を動かす時は、動かした先で担当者・部屋がふさがっていないか（でお要望 2026-10-21）
  if ('date' in update || 'start_time' in update || 'end_time' in update) {
    const { data: cur } = await supabase.from('provider_slots').select('date, start_time, end_time, staff_id, resource_id').eq('id', sessionId).eq('provider_id', provider.id).maybeSingle();
    const { data: cls } = await supabase.from('provider_classes').select('instructor_staff_id, resource_id').eq('id', id).maybeSingle();
    if (cur) {
      const conflict = await lessonConflict(supabase, provider.id, { date: update.date || cur.date, startTime: update.start_time || cur.start_time, endTime: update.end_time || cur.end_time, staffId: cur.staff_id || cls?.instructor_staff_id, resourceId: cur.resource_id || cls?.resource_id, excludeSlotId: sessionId });
      if (conflict) return Response.json({ error: conflict, code: 'conflict' }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .from('provider_slots')
    .update(update)
    .eq('id', sessionId)
    .eq('provider_id', provider.id)
    .eq('class_id', id)
    .select()
    .single();
  if (error || !data) return Response.json({ error: '開催回が見つかりません' }, { status: 404 });
  return Response.json(data);
}

async function __DELETE(request, { params }) {
  const { id, sessionId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'class_management'); if (locked) return locked; }

  const { data: booked } = await supabase.from('reservations').select('id').eq('slot_id', sessionId).in('status', OCCUPYING_STATUSES).limit(1);
  if (booked?.length) return Response.json({ error: '予約中のお客様がいるため削除できません。先に予約側をキャンセルしてください' }, { status: 409 });

  const { error } = await supabase.from('provider_slots').delete().eq('id', sessionId).eq('provider_id', provider.id).eq('class_id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
