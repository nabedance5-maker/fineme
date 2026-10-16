// POST /api/provider/attendance/paid-leave/grants { staff_id, granted_on, days, note } → 有給を付与（勤怠の管理者のみ）
export const dynamic = 'force-dynamic';
import { providerFromRequest, requireAttendanceAdmin } from '@/lib/attendance-auth';
import { addYears } from '@/lib/paid-leave';
import { withAudit } from '@/lib/activity-log';

async function __POST(request) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  const gate = await requireAttendanceAdmin(db, provider, request);
  if (gate.error) return gate.error;
  const body = await request.json().catch(() => ({}));
  const days = Math.round(Number(body.days) * 2) / 2;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.granted_on || ''))) return Response.json({ error: '付与日を入れてください' }, { status: 400 });
  if (!(days > 0 && days <= 40)) return Response.json({ error: '日数は0.5〜40日の範囲で入れてください' }, { status: 400 });
  const { data: staff } = await db.from('provider_staff').select('id').eq('id', body.staff_id).eq('provider_id', provider.id).maybeSingle();
  if (!staff) return Response.json({ error: 'スタッフが見つかりません' }, { status: 404 });
  const { data, error: insErr } = await db.from('provider_paid_leave_grants').insert({
    provider_id: provider.id, staff_id: staff.id, granted_on: body.granted_on, expires_on: addYears(body.granted_on, 2),
    days, note: String(body.note || '').trim().slice(0, 100) || null, created_by: gate.admin.name,
  }).select().single();
  if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
  return Response.json(data);
}
export const POST = withAudit(__POST);
