// PATCH /api/provider/reservations/[id]/assign → 予約カレンダーからの担当スタッフ・部屋の割り当て変更
// 承認/お断り等のステータス遷移を扱う既存の PATCH /api/reservations/[id] とは別に、
// 「指名なし」の予約に後から担当を割り振る・部屋を割り当てるためだけの軽量エンドポイント
// （でお要望2026-09-12）。ステータスは変更しない。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { checkStoreBooking } from '@/lib/booking-check';
import { reservationMinutes } from '@/lib/availability-engine';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, booking_unit, business_hours, booking_interval_minutes, store_capacity, enabled_features, plan').eq('email', user.email).single();
  return data || null;
}

async function __PATCH(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = {};
  if ('staff_id' in body) {
    update.staff_id = body.staff_id || null;
    // カレンダーから店舗が担当を割り当てた予約は、お客様の指名（またはお任せ）と区別できるよう
    // フラグを立てる（でお要望2026-09-12：担当スタッフの列に出た時に見分けたい）。
    // 未割当に戻した場合は割り当て自体が無くなるためフラグも戻す。
    update.staff_manually_assigned = !!body.staff_id;
  }
  if ('resource_id' in body) update.resource_id = body.resource_id || null;
  // 手動登録した予約（電話予約等）を後からFineme会員と紐付ける（でお要望2026-09-14：
  // 「Finemeの会員情報と後からでもその時でも紐づけられるように」）。既にuser_idが
  // 付いている予約を上書きしないよう、店舗側の操作は「まだ未紐付けの予約に設定する」
  // 用途のみ許可する（誤って別人に付け替えてしまう事故を防ぐ）。
  if ('user_id' in body && body.user_id) {
    const { data: existing } = await supabase.from('reservations').select('user_id').eq('id', params.id).eq('provider_id', provider.id).single();
    if (existing?.user_id) return Response.json({ error: 'この予約は既にFineme会員と紐付いています' }, { status: 409 });
    update.user_id = body.user_id;
  }
  if (!Object.keys(update).length) return Response.json({ error: '更新項目がありません' }, { status: 400 });

  // 担当・部屋を変える時は、その時間に空いているか確かめる（2026-11-10 渡邉報告：空いていない部屋に変えられた）
  if ('staff_id' in update || 'resource_id' in update) {
    const { data: r } = await supabase.from('reservations').select('id, status, reserved_date, confirmed_date, start_time, confirmed_time, end_time, staff_id, resource_id, service_id, slot_id, class_id, user_id')
      .eq('id', params.id).eq('provider_id', provider.id).maybeSingle();
    if (!r) return Response.json({ error: '予約が見つかりません' }, { status: 404 });
    if (!r.class_id && ['approved', 'pending', 'counter_proposed'].includes(r.status)) {
      let slotDur = {};
      if (r.slot_id) { const { data: sl } = await supabase.from('provider_slots').select('start_time, end_time').eq('id', r.slot_id).maybeSingle(); if (sl) { const m = t => { const [h, mm] = String(t).split(':').map(Number); return h * 60 + (mm || 0); }; slotDur = { [r.slot_id]: m(sl.end_time) - m(sl.start_time) }; } }
      let svcs = {};
      if (r.service_id) { const { data: sv } = await supabase.from('provider_services').select('id, duration_minutes').eq('id', r.service_id).maybeSingle(); if (sv) svcs = { [sv.id]: sv }; }
      const start = String(r.confirmed_time || r.start_time || '').slice(0, 5);
      const dur = reservationMinutes(r, slotDur, svcs);
      const [h, m] = start.split(':').map(Number); const t = h * 60 + m + dur;
      const end = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
      const nextStaff = 'staff_id' in update ? update.staff_id : r.staff_id;
      const nextRes = 'resource_id' in update ? update.resource_id : r.resource_id;
      const chk = await checkStoreBooking(supabase, provider, {
        date: r.confirmed_date || r.reserved_date, startTime: start, endTime: end,
        staffId: nextStaff, resourceId: nextRes, serviceId: r.service_id, excludeId: r.id,
      });
      if (!chk.ok) return Response.json({ error: chk.error }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .from('reservations')
    .update(update)
    .eq('id', params.id)
    .eq('provider_id', provider.id)
    .select('id, staff_id, resource_id, staff_manually_assigned, user_id')
    .single();

  if (error) return Response.json({ error: '予約が見つかりません' }, { status: 404 });
  return Response.json(data);
}

export const PATCH = withAudit(__PATCH);
