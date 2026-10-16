// DELETE /api/provider/attendance/paid-leave/grants/[id] → 付与の登録を取り消す（入力間違いの修正用・勤怠の管理者のみ）
export const dynamic = 'force-dynamic';
import { providerFromRequest, requireAttendanceAdmin } from '@/lib/attendance-auth';
import { withAudit } from '@/lib/activity-log';

async function __DELETE(request, { params }) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  const gate = await requireAttendanceAdmin(db, provider, request);
  if (gate.error) return gate.error;
  const { id } = await params;
  const { error: delErr } = await db.from('provider_paid_leave_grants').delete().eq('id', id).eq('provider_id', provider.id);
  if (delErr) return Response.json({ error: delErr.message }, { status: 500 });
  return Response.json({ ok: true });
}
export const DELETE = withAudit(__DELETE);
