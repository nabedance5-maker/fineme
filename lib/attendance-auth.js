// 勤怠APIの認証：管理画面（店舗ログイン）と、店頭タブレット（登録済み端末のトークン）
import { getSupabase } from './supabase.js';
import { planLockedResponse } from './plan-features.js';
import { hashToken, verifyPin } from './attendance.js';

export async function providerFromRequest(request) {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  const db = getSupabase();
  const { data: { user }, error } = await db.auth.getUser(auth.replace('Bearer ', ''));
  if (error || !user) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: provider } = await db.from('providers').select('id, name, plan, enabled_features').eq('email', user.email).single();
  if (!provider) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  const locked = planLockedResponse(provider, 'attendance');
  if (locked) return { error: locked };
  return { db, provider };
}

export async function deviceFromRequest(request) {
  const token = request.headers.get('x-kiosk-token');
  if (!token) return { error: Response.json({ error: 'この端末は打刻用に登録されていません', code: 'not_paired' }, { status: 401 }) };
  const db = getSupabase();
  const { data: device } = await db.from('provider_attendance_devices').select('id, provider_id, name, revoked_at').eq('token_hash', hashToken(token)).maybeSingle();
  if (!device || device.revoked_at) return { error: Response.json({ error: 'この端末の登録は取り消されています。管理画面で登録し直してください', code: 'not_paired' }, { status: 401 }) };
  const { data: provider } = await db.from('providers').select('id, name, plan, enabled_features').eq('id', device.provider_id).single();
  const locked = planLockedResponse(provider, 'attendance');
  if (locked) return { error: locked };
  return { db, device, provider };
}

// ── 勤怠の管理者（でお要望 2026-10-16） ─────────────────────────────
// 打刻の追加・取り消し、端末の登録・取り消し、暗証番号の設定、管理者の変更は、指名された
// 「勤怠の管理者」が自分の暗証番号でロックを解除した時（15分有効）だけできる。
// 管理者がまだ1人もいない店舗は、最初の設定（暗証番号の設定と管理者の指名）だけを許可する。
export const UNLOCK_MINUTES = 15;

export async function adminCount(db, providerId) {
  const { count } = await db.from('provider_staff').select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId).eq('attendance_admin', true).not('attendance_pin_hash', 'is', null);
  return count || 0;
}

// 有効なロック解除トークンなら { id, name } を返す
export async function unlockedAdmin(db, providerId, request) {
  const token = request.headers.get('x-attendance-unlock');
  if (!token) return null;
  const { data: u } = await db.from('provider_attendance_unlocks').select('staff_id, expires_at, revoked_at')
    .eq('provider_id', providerId).eq('token_hash', hashToken(token)).maybeSingle();
  if (!u || u.revoked_at || new Date(u.expires_at) < new Date()) return null;
  const { data: staff } = await db.from('provider_staff').select('id, name, attendance_admin').eq('id', u.staff_id).eq('provider_id', providerId).maybeSingle();
  if (!staff?.attendance_admin) return null;
  return { id: staff.id, name: staff.name };
}

// 管理者のロック解除を必須にする。bootstrapOk のときは、管理者が0人なら解除なしで通す（admin は null）。
export async function requireAttendanceAdmin(db, provider, request, { bootstrapOk = false } = {}) {
  const admin = await unlockedAdmin(db, provider.id, request);
  if (admin) return { admin };
  const count = await adminCount(db, provider.id);
  if (count === 0) {
    if (bootstrapOk) return { admin: null, bootstrap: true };
    return { error: Response.json({ error: '先に「勤怠の管理者」を決めてください（勤怠タブの「勤怠の管理者」から）', code: 'no_admin' }, { status: 403 }) };
  }
  return { error: Response.json({ error: '勤怠の管理者の暗証番号でロックを解除してから操作してください', code: 'locked' }, { status: 403 }) };
}

// スタッフの暗証番号を確認する（5回続けて間違えると10分ロック。打刻と管理者のロック解除で共通）
export async function checkStaffPin(db, staff, pin) {
  if (!staff.attendance_pin_hash) return { error: Response.json({ error: '暗証番号が未設定です' }, { status: 400 }) };
  if (staff.attendance_pin_locked_until && new Date(staff.attendance_pin_locked_until) > new Date()) {
    return { error: Response.json({ error: '暗証番号を続けて間違えたため、しばらく使えません。10分ほど待ってからお試しください' }, { status: 429 }) };
  }
  if (!verifyPin(String(pin || ''), staff.attendance_pin_hash)) {
    const failures = (staff.attendance_pin_failures || 0) + 1;
    await db.from('provider_staff').update({
      attendance_pin_failures: failures >= 5 ? 0 : failures,
      attendance_pin_locked_until: failures >= 5 ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null,
    }).eq('id', staff.id);
    return { error: Response.json({ error: failures >= 5 ? '暗証番号を5回間違えたため、10分間使えません' : `暗証番号が違います（あと${5 - failures}回でロックされます）` }, { status: 401 }) };
  }
  if (staff.attendance_pin_failures) await db.from('provider_staff').update({ attendance_pin_failures: 0 }).eq('id', staff.id);
  return { ok: true };
}
