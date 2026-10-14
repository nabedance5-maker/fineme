// GET /api/attendance-kiosk/state → 店頭タブレット：店舗名・スタッフ一覧と今の状態（勤務中・休憩中・勤務外）
export const dynamic = 'force-dynamic';
import { deviceFromRequest } from '@/lib/attendance-auth';
import { currentStatus } from '@/lib/attendance';

export async function GET(request) {
  const { db, device, provider, error } = await deviceFromRequest(request);
  if (error) return error;
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [{ data: staff }, { data: punches }] = await Promise.all([
    db.from('provider_staff').select('id, name, attendance_pin_hash').eq('provider_id', provider.id).order('sort_order', { ascending: true }),
    db.from('provider_attendance_punches').select('staff_id, kind, punched_at, voided_at').eq('provider_id', provider.id).gte('punched_at', since).is('voided_at', null),
  ]);
  await db.from('provider_attendance_devices').update({ last_used_at: new Date().toISOString() }).eq('id', device.id);
  return Response.json({
    provider: { name: provider.name },
    device: { name: device.name },
    server_time: new Date().toISOString(),
    staff: (staff || []).map(s => {
      const st = currentStatus((punches || []).filter(p => p.staff_id === s.id));
      return { id: s.id, name: s.name, has_pin: !!s.attendance_pin_hash, status: st.status, since: st.since };
    }),
  });
}
