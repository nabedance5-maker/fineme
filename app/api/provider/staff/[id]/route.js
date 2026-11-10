// PATCH  /api/provider/staff/[id] → スタッフ更新
// DELETE /api/provider/staff/[id] → スタッフ削除
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

async function __PATCH(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const updates = {};
  if (body.name !== undefined)             updates.name             = String(body.name || '').slice(0, 100);
  if (body.role !== undefined)             updates.role             = body.role ? String(body.role).slice(0, 100) : null;
  if (body.bio !== undefined)              updates.bio              = body.bio  ? String(body.bio).slice(0, 800)  : null;
  if (body.photo_url !== undefined)        updates.photo_url        = body.photo_url || null;
  if (body.experience_years !== undefined) updates.experience_years = body.experience_years ? Number(body.experience_years) : null;
  if (body.credentials !== undefined)      updates.credentials      = body.credentials ? String(body.credentials).slice(0, 400) : null;
  if (body.is_featured !== undefined)      updates.is_featured      = !!body.is_featured;
  if (body.sort_order !== undefined)       updates.sort_order       = Number(body.sort_order) || 0;
  if (body.strong_types !== undefined)     updates.strong_types     = Array.isArray(body.strong_types) ? body.strong_types : [];
  if (body.strong_axes !== undefined)      updates.strong_axes      = Array.isArray(body.strong_axes) ? body.strong_axes : [];
  if (body.bookable !== undefined)         updates.bookable         = !!body.bookable;
  if (body.is_public !== undefined)        updates.is_public        = !!body.is_public;
  if (body.booking_fee !== undefined)      updates.booking_fee      = Math.max(0, Number(body.booking_fee) || 0);

  const { data, error } = await supabase
    .from('provider_staff')
    .update(updates)
    .eq('id', id)
    .eq('provider_id', provider.id)
    .select()
    .single();

  if (error || !data) return Response.json({ error: '該当スタッフが見つかりません' }, { status: 404 });
  return Response.json(data);
}

async function __DELETE(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // 勤怠の管理者は、勤怠タブで管理者を外してから削除する（削除で管理者が0人になると、
  // 管理画面に入れる人なら誰でも勤怠を直せる状態に戻ってしまうため）
  const { data: target } = await supabase.from('provider_staff').select('attendance_admin').eq('id', id).eq('provider_id', provider.id).maybeSingle();
  if (target?.attendance_admin) {
    return Response.json({ error: 'このスタッフは勤怠の管理者です。勤怠タブで管理者を外してから削除してください' }, { status: 409 });
  }

  // これから先の担当の予約が残っている時は削除できない（削除するとシフトも一緒に消え、担当のいない予約になるため。
  // 2026-11-10 渡邉判断：予約があるのにシフトを外せないように）
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const { data: upcoming } = await supabase.from('reservations')
    .select('id, user_id, user_name, user_contact, reserved_date, start_time, confirmed_date, confirmed_time, counter_date, counter_time, status')
    .eq('provider_id', provider.id).eq('staff_id', id).in('status', ['pending', 'approved', 'counter_proposed'])
    .or(`reserved_date.gte.${today},confirmed_date.gte.${today},counter_date.gte.${today}`)
    .order('reserved_date').limit(20);
  if (upcoming?.length) {
    const reservations = upcoming.map(r => {
      const counter = r.status === 'counter_proposed' && r.counter_date;
      const date = counter ? r.counter_date : (r.confirmed_date || r.reserved_date);
      const time = String((counter ? r.counter_time : r.confirmed_time) || r.start_time || '').slice(0, 5);
      return { id: r.id, name: r.user_name || 'お客様', date, time, user_id: r.user_id || null, contact: r.user_contact || '', status: r.status };
    }).filter(r => r.date >= today);
    if (reservations.length) {
      return Response.json({ error: `このスタッフが担当する予約が${reservations.length}件あります。先に予約の担当スタッフを変えるか、お店の都合でキャンセルしてから削除してください`, reservations }, { status: 409 });
    }
  }

  const { error } = await supabase
    .from('provider_staff')
    .delete()
    .eq('id', id)
    .eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
