// PATCH /api/provider/attendance/punches/[id] → 打刻を取り消す（消さずに取り消し済みとして残す）。理由は必須。
// body: { reason, replace_at?: "YYYY-MM-DDTHH:mm" } replace_at があれば同じ種類で正しい時刻の打刻を追加する
export const dynamic = 'force-dynamic';
import { providerFromRequest, requireAttendanceAdmin, adminCount } from '@/lib/attendance-auth';
import { jstLocalToIso } from '@/lib/attendance';
import { withAudit } from '@/lib/activity-log';

async function __PATCH(request, { params }) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  const gate = await requireAttendanceAdmin(db, provider, request);
  if (gate.error) return gate.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason || '').trim().slice(0, 200);
  if (!reason) return Response.json({ error: '修正の理由を入力してください' }, { status: 400 });
  const { data: punch } = await db.from('provider_attendance_punches').select('*').eq('id', id).eq('provider_id', provider.id).maybeSingle();
  if (!punch) return Response.json({ error: '打刻が見つかりません' }, { status: 404 });
  if (punch.voided_at) return Response.json({ error: 'この打刻はすでに取り消されています' }, { status: 409 });
  if (punch.staff_id === gate.admin.id && (await adminCount(db, provider.id)) > 1) {
    return Response.json({ error: '自分の打刻は直せません。ほかの勤怠の管理者に依頼してください' }, { status: 403 });
  }
  let replaceIso = null;
  if (body.replace_at) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(body.replace_at))) return Response.json({ error: '正しい日時を入力してください' }, { status: 400 });
    replaceIso = jstLocalToIso(body.replace_at);
    if (new Date(replaceIso).getTime() > Date.now() + 5 * 60 * 1000) return Response.json({ error: '未来の時刻は入力できません' }, { status: 400 });
  }
  const who = gate.admin.name;
  const { error: upErr } = await db.from('provider_attendance_punches').update({ voided_at: new Date().toISOString(), voided_by: who, void_reason: reason }).eq('id', id);
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
  let replacement = null;
  if (replaceIso) {
    const { data } = await db.from('provider_attendance_punches')
      .insert({ provider_id: provider.id, staff_id: punch.staff_id, kind: punch.kind, punched_at: replaceIso, source: 'manual', note: `修正：${reason}`, created_by: who })
      .select().single();
    replacement = data;
  }
  return Response.json({ ok: true, replacement });
}
export const PATCH = withAudit(__PATCH);
