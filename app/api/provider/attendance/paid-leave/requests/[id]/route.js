// PATCH /api/provider/attendance/paid-leave/requests/[id] { status: 'approved'|'rejected'|'cancelled', note }
// → 有給の申請を承認・却下（承認済みの取り消しも可）。勤怠の管理者のみ。自分の申請は、ほかに管理者がいればその人が判断する。
export const dynamic = 'force-dynamic';
import { providerFromRequest, requireAttendanceAdmin, adminCount } from '@/lib/attendance-auth';
import { leaveSummary, LEAVE_UNIT_LABEL } from '@/lib/paid-leave';
import { sendLinePushWithAction } from '@/lib/line-push';
import { withAudit } from '@/lib/activity-log';

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';
const jstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

async function __PATCH(request, { params }) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  const gate = await requireAttendanceAdmin(db, provider, request);
  if (gate.error) return gate.error;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const next = body.status;
  if (!['approved', 'rejected', 'cancelled'].includes(next)) return Response.json({ error: '操作が正しくありません' }, { status: 400 });
  const { data: req } = await db.from('provider_paid_leave_requests').select('*').eq('id', id).eq('provider_id', provider.id).maybeSingle();
  if (!req) return Response.json({ error: '申請が見つかりません' }, { status: 404 });
  if (next === 'cancelled' ? req.status !== 'approved' : req.status !== 'pending') {
    return Response.json({ error: 'この申請はすでに処理されています' }, { status: 409 });
  }
  if (req.staff_id === gate.admin.id && (await adminCount(db, provider.id)) > 1) {
    return Response.json({ error: '自分の申請は、ほかの勤怠の管理者に判断してもらってください' }, { status: 403 });
  }
  if (next === 'approved') {
    const [{ data: grants }, { data: reqs }] = await Promise.all([
      db.from('provider_paid_leave_grants').select('granted_on, expires_on, days').eq('provider_id', provider.id).eq('staff_id', req.staff_id),
      db.from('provider_paid_leave_requests').select('date, days, status').eq('provider_id', provider.id).eq('staff_id', req.staff_id),
    ]);
    const sum = leaveSummary(grants || [], reqs || [], jstToday());
    if (sum.remaining < Number(req.days)) return Response.json({ error: `有給の残りが足りません（残り${sum.remaining}日）。先に付与を登録してください` }, { status: 400 });
  }
  const note = String(body.note || '').trim().slice(0, 200) || null;
  const { error: upErr } = await db.from('provider_paid_leave_requests')
    .update({ status: next, decided_at: new Date().toISOString(), decided_by: gate.admin.name, decision_note: note }).eq('id', id);
  if (upErr) return Response.json({ error: upErr.message }, { status: 500 });

  // スタッフがLINE連携していれば結果を知らせる
  try {
    const { data: staff } = await db.from('provider_staff').select('line_user_id, shift_access_token').eq('id', req.staff_id).single();
    if (staff?.line_user_id) {
      const label = next === 'approved' ? '承認されました' : next === 'rejected' ? '却下されました' : '取り消されました';
      const text = `${provider.name}：${req.date.slice(5).replace('-', '/')}（${LEAVE_UNIT_LABEL[req.unit]}）の有給が${label}。${note ? `\n${note}` : ''}`;
      await sendLinePushWithAction(staff.line_user_id, text, staff.shift_access_token ? { label: '有給の状況を見る', caption: '残り日数と申請の一覧を確認できます', uri: `${BASE}/staff-shift/${staff.shift_access_token}#paid-leave` } : null);
    }
  } catch { /* 通知の失敗で判断は取り消さない */ }
  return Response.json({ ok: true });
}
export const PATCH = withAudit(__PATCH);
