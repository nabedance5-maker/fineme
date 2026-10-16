// POST /api/provider/attendance/pin → スタッフの打刻用暗証番号（4〜6桁）を設定。pin:null で解除。
// 勤怠の管理者のロック解除が必要（管理者がまだいない店舗の最初の設定を除く）。
export const dynamic = 'force-dynamic';
import { providerFromRequest, requireAttendanceAdmin } from '@/lib/attendance-auth';
import { hashPin, isValidPin } from '@/lib/attendance';
import { withAudit } from '@/lib/activity-log';

async function __POST(request) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  // 管理者がまだいない店舗は、最初の設定として解除なしで設定できる
  const gate = await requireAttendanceAdmin(db, provider, request, { bootstrapOk: true });
  if (gate.error) return gate.error;
  const body = await request.json().catch(() => ({}));
  if (body.pin !== null && !isValidPin(body.pin)) return Response.json({ error: '暗証番号は4〜6桁の数字にしてください' }, { status: 400 });
  const { data: staff } = await db.from('provider_staff').select('id').eq('id', body.staff_id).eq('provider_id', provider.id).maybeSingle();
  if (!staff) return Response.json({ error: 'スタッフが見つかりません' }, { status: 404 });
  const { error: upErr } = await db.from('provider_staff')
    .update({ attendance_pin_hash: body.pin === null ? null : hashPin(body.pin), attendance_pin_failures: 0, attendance_pin_locked_until: null }).eq('id', staff.id);
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  return Response.json({ ok: true });
}
export const POST = withAudit(__POST);
