// DELETE /api/provider/attendance/devices/[id] → 端末の登録を取り消す（その端末からは打刻できなくなる）
export const dynamic = 'force-dynamic';
import { providerFromRequest, requireAttendanceAdmin } from '@/lib/attendance-auth';
import { withAudit } from '@/lib/activity-log';

async function __DELETE(request, { params }) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  const gate = await requireAttendanceAdmin(db, provider, request);
  if (gate.error) return gate.error;
  const { id } = await params;
  const { error: upErr } = await db.from('provider_attendance_devices')
    .update({ revoked_at: new Date().toISOString(), token_hash: null, pairing_code: null }).eq('id', id).eq('provider_id', provider.id);
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  return Response.json({ ok: true });
}
export const DELETE = withAudit(__DELETE);
