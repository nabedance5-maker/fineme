// POST /api/provider/attendance/punches → 打刻を手入力で追加（打ち忘れの補正）。理由は必須。
// 勤怠の管理者のロック解除が必要（直した人＝管理者の名前を記録する）。
// body: { staff_id, kind, at: "YYYY-MM-DDTHH:mm"（日本時間）, note }
export const dynamic = 'force-dynamic';
import { providerFromRequest, requireAttendanceAdmin, adminCount } from '@/lib/attendance-auth';
import { PUNCH_LABEL, jstLocalToIso } from '@/lib/attendance';
import { withAudit } from '@/lib/activity-log';

async function __POST(request) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  const gate = await requireAttendanceAdmin(db, provider, request);
  if (gate.error) return gate.error;
  const body = await request.json().catch(() => ({}));
  if (!PUNCH_LABEL[body.kind]) return Response.json({ error: '打刻の種類が正しくありません' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(body.at || ''))) return Response.json({ error: '日時を入力してください' }, { status: 400 });
  const note = String(body.note || '').trim().slice(0, 200);
  if (!note) return Response.json({ error: '修正の理由を入力してください' }, { status: 400 });
  const { data: staff } = await db.from('provider_staff').select('id').eq('id', body.staff_id).eq('provider_id', provider.id).maybeSingle();
  if (!staff) return Response.json({ error: 'スタッフが見つかりません' }, { status: 404 });
  // 自分の勤怠は、ほかに管理者がいる場合はその人に直してもらう（不正防止）
  if (staff.id === gate.admin.id && (await adminCount(db, provider.id)) > 1) {
    return Response.json({ error: '自分の打刻は直せません。ほかの勤怠の管理者に依頼してください' }, { status: 403 });
  }
  const punchedAt = jstLocalToIso(body.at);
  if (new Date(punchedAt).getTime() > Date.now() + 5 * 60 * 1000) return Response.json({ error: '未来の時刻は入力できません' }, { status: 400 });
  const { data, error: insErr } = await db.from('provider_attendance_punches')
    .insert({ provider_id: provider.id, staff_id: staff.id, kind: body.kind, punched_at: punchedAt, source: 'manual', note, created_by: gate.admin.name })
    .select().single();
  if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
  return Response.json(data);
}
export const POST = withAudit(__POST);
