// GET    /api/provider/attendance/unlock → 勤怠の管理者の一覧と、今のロック解除状態
// POST   /api/provider/attendance/unlock { staff_id, pin } → 管理者が自分の暗証番号でロックを解除（15分有効）
// DELETE /api/provider/attendance/unlock → ロックをかけ直す
// でお要望（2026-10-16）：管理画面に入れる人なら誰でも勤怠を直せる状態をやめる。
export const dynamic = 'force-dynamic';
import { providerFromRequest, unlockedAdmin, checkStaffPin, UNLOCK_MINUTES } from '@/lib/attendance-auth';
import { hashToken, newToken } from '@/lib/attendance';
import { withAudit } from '@/lib/activity-log';

export async function GET(request) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  const [{ data: staff }, current] = await Promise.all([
    db.from('provider_staff').select('id, name, attendance_admin, attendance_pin_hash').eq('provider_id', provider.id).order('sort_order', { ascending: true }),
    unlockedAdmin(db, provider.id, request),
  ]);
  const admins = (staff || []).filter(s => s.attendance_admin && s.attendance_pin_hash).map(s => ({ id: s.id, name: s.name }));
  let expiresAt = null;
  if (current) {
    const { data } = await db.from('provider_attendance_unlocks').select('expires_at').eq('token_hash', hashToken(request.headers.get('x-attendance-unlock'))).maybeSingle();
    expiresAt = data?.expires_at || null;
  }
  return Response.json({ admins, has_admin: admins.length > 0, unlocked: current ? { ...current, expires_at: expiresAt } : null });
}

async function __POST(request) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const { data: staff } = await db.from('provider_staff')
    .select('id, name, attendance_admin, attendance_pin_hash, attendance_pin_failures, attendance_pin_locked_until')
    .eq('id', body.staff_id).eq('provider_id', provider.id).maybeSingle();
  if (!staff || !staff.attendance_admin) return Response.json({ error: 'このスタッフは勤怠の管理者ではありません' }, { status: 403 });
  const check = await checkStaffPin(db, staff, body.pin);
  if (check.error) return check.error;
  const token = newToken();
  const expiresAt = new Date(Date.now() + UNLOCK_MINUTES * 60 * 1000).toISOString();
  const { error: insErr } = await db.from('provider_attendance_unlocks').insert({ provider_id: provider.id, staff_id: staff.id, token_hash: hashToken(token), expires_at: expiresAt });
  if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
  // 期限切れの古い解除記録は掃除しておく
  await db.from('provider_attendance_unlocks').delete().eq('provider_id', provider.id).lt('expires_at', new Date(Date.now() - 86400000).toISOString());
  return Response.json({ token, staff: { id: staff.id, name: staff.name }, expires_at: expiresAt });
}

async function __DELETE(request) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  const token = request.headers.get('x-attendance-unlock');
  if (token) await db.from('provider_attendance_unlocks').update({ revoked_at: new Date().toISOString() }).eq('provider_id', provider.id).eq('token_hash', hashToken(token));
  return Response.json({ ok: true });
}

export const POST = withAudit(__POST);
export const DELETE = withAudit(__DELETE);
