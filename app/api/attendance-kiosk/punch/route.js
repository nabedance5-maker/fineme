// POST /api/attendance-kiosk/punch → 店頭タブレットで打刻。body: { staff_id, pin, kind }
// 時刻はサーバーの時刻で記録する（端末の時計を変えても打刻時刻は変わらない）。
// 暗証番号を5回続けて間違えると、そのスタッフは10分間打刻できない。
export const dynamic = 'force-dynamic';
import { deviceFromRequest } from '@/lib/attendance-auth';
import { PUNCH_LABEL, allowedKinds, currentStatus, verifyPin, jstTime } from '@/lib/attendance';

export async function POST(request) {
  const { db, device, provider, error } = await deviceFromRequest(request);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const { data: staff } = await db.from('provider_staff')
    .select('id, name, attendance_pin_hash, attendance_pin_failures, attendance_pin_locked_until')
    .eq('id', body.staff_id).eq('provider_id', provider.id).maybeSingle();
  if (!staff) return Response.json({ error: 'スタッフが見つかりません' }, { status: 404 });
  if (!staff.attendance_pin_hash) return Response.json({ error: '暗証番号が未設定です。店長に設定してもらってください' }, { status: 400 });
  if (staff.attendance_pin_locked_until && new Date(staff.attendance_pin_locked_until) > new Date()) {
    return Response.json({ error: '暗証番号を続けて間違えたため、しばらく打刻できません。10分ほど待ってからお試しください' }, { status: 429 });
  }
  if (!verifyPin(String(body.pin || ''), staff.attendance_pin_hash)) {
    const failures = (staff.attendance_pin_failures || 0) + 1;
    await db.from('provider_staff').update({
      attendance_pin_failures: failures >= 5 ? 0 : failures,
      attendance_pin_locked_until: failures >= 5 ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null,
    }).eq('id', staff.id);
    return Response.json({ error: failures >= 5 ? '暗証番号を5回間違えたため、10分間打刻できません' : `暗証番号が違います（あと${5 - failures}回でロックされます）` }, { status: 401 });
  }
  if (staff.attendance_pin_failures) await db.from('provider_staff').update({ attendance_pin_failures: 0 }).eq('id', staff.id);

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: recent } = await db.from('provider_attendance_punches').select('kind, punched_at, voided_at').eq('staff_id', staff.id).gte('punched_at', since).is('voided_at', null);
  const st = currentStatus(recent || []);
  // 暗証番号の確認だけ（打刻はしない）：今の状態と押せる打刻を返す
  if (!body.kind) return Response.json({ ok: true, staff: { id: staff.id, name: staff.name }, status: st.status, allowed: allowedKinds(st.status) });
  if (!allowedKinds(st.status).includes(body.kind)) {
    return Response.json({ error: `今は「${PUNCH_LABEL[body.kind] || body.kind}」は打刻できません` }, { status: 409 });
  }
  const now = new Date().toISOString();
  const rows = [];
  // 休憩中に退勤した場合は、同じ時刻で休憩終了も記録する
  if (body.kind === 'out' && st.status === 'break') rows.push({ provider_id: provider.id, staff_id: staff.id, kind: 'break_end', punched_at: now, source: 'kiosk', device_id: device.id, created_by: staff.name });
  rows.push({ provider_id: provider.id, staff_id: staff.id, kind: body.kind, punched_at: now, source: 'kiosk', device_id: device.id, created_by: staff.name });
  const { error: insErr } = await db.from('provider_attendance_punches').insert(rows);
  if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
  return Response.json({ ok: true, staff_name: staff.name, kind: body.kind, label: PUNCH_LABEL[body.kind], time: jstTime(now) });
}
