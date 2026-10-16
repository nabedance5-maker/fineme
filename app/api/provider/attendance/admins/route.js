// POST /api/provider/attendance/admins { staff_id, admin: true|false } → 勤怠の管理者に指名・解除
// 管理者がまだいない店舗は最初の1人をロック解除なしで指名できる（暗証番号の設定が前提）。
// それ以降は、管理者のロック解除が必要。最後の1人は解除できない（誰でも直せる状態に戻さないため）。
export const dynamic = 'force-dynamic';
import { providerFromRequest, requireAttendanceAdmin, adminCount } from '@/lib/attendance-auth';
import { withAudit } from '@/lib/activity-log';

async function __POST(request) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  const gate = await requireAttendanceAdmin(db, provider, request, { bootstrapOk: true });
  if (gate.error) return gate.error;
  const body = await request.json().catch(() => ({}));
  const { data: staff } = await db.from('provider_staff').select('id, name, attendance_admin, attendance_pin_hash')
    .eq('id', body.staff_id).eq('provider_id', provider.id).maybeSingle();
  if (!staff) return Response.json({ error: 'スタッフが見つかりません' }, { status: 404 });
  const makeAdmin = body.admin === true;
  if (makeAdmin && !staff.attendance_pin_hash) {
    return Response.json({ error: `${staff.name}さんの暗証番号を先に設定してください（管理者は自分の暗証番号でロックを解除します）` }, { status: 400 });
  }
  if (!makeAdmin && staff.attendance_admin && (await adminCount(db, provider.id)) <= 1) {
    return Response.json({ error: '最後の管理者は外せません。先に別の人を管理者にしてください' }, { status: 400 });
  }
  const { error: upErr } = await db.from('provider_staff').update({ attendance_admin: makeAdmin }).eq('id', staff.id);
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  if (!makeAdmin) await db.from('provider_attendance_unlocks').update({ revoked_at: new Date().toISOString() }).eq('staff_id', staff.id).is('revoked_at', null);
  return Response.json({ ok: true });
}
export const POST = withAudit(__POST);
