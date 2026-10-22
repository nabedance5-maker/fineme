// GET/PUT /api/provider/booking-settings → 予約を何で受けるか（受付の単位）・開始時刻の刻み・人数で受ける時の同時人数
// （でお要望 2026-10-21：空き枠を作らせず、お店の登録済みの情報から受けられる時間を計算する。lib/availability-engine.js）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { effectiveUnit } from '@/lib/availability-engine';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const pid = a.provider.id;
  const [{ data: p }, { data: staff }, { data: res }] = await Promise.all([
    supabase.from('providers').select('booking_unit, booking_interval_minutes, store_capacity, enabled_features').eq('id', pid).single(),
    supabase.from('provider_staff').select('id, bookable').eq('provider_id', pid),
    supabase.from('provider_resources').select('id, active').eq('provider_id', pid),
  ]);
  return Response.json({
    booking_unit: p.booking_unit, effective_unit: effectiveUnit(p, staff || []),
    booking_interval_minutes: p.booking_interval_minutes, store_capacity: p.store_capacity,
    staff_count: (staff || []).filter(s => s.bookable !== false).length,
    resource_count: (res || []).filter(r => r.active !== false).length,
    shift_management: !!p.enabled_features?.shift_management,
  });
}

async function __PUT(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const up = {};
  if ('booking_unit' in b) {
    if (!['staff', 'resource', 'both', 'capacity'].includes(b.booking_unit)) return Response.json({ error: '受付の単位を選んでください' }, { status: 400 });
    up.booking_unit = b.booking_unit;
  }
  if ('booking_interval_minutes' in b) {
    const v = Number(b.booking_interval_minutes);
    if (![10, 15, 20, 30, 60].includes(v)) return Response.json({ error: '刻みは10・15・20・30・60分から選んでください' }, { status: 400 });
    up.booking_interval_minutes = v;
  }
  if ('store_capacity' in b) {
    const v = Math.round(Number(b.store_capacity));
    if (!(v >= 1 && v <= 500)) return Response.json({ error: '同時に受ける人数は1〜500で入れてください' }, { status: 400 });
    up.store_capacity = v;
  }
  const { error } = await supabase.from('providers').update(up).eq('id', a.provider.id);
  if (error) return Response.json({ error: '保存できませんでした' }, { status: 500 });
  return Response.json({ ok: true });
}
export const PUT = withAudit(__PUT);
