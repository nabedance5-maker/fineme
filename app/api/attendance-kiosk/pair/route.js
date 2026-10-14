// POST /api/attendance-kiosk/pair → 管理画面で発行した6桁の登録コードで、この端末を打刻用に登録する。
// 成功すると端末トークンを1度だけ返す（端末側はlocalStorageに保存し、以降の打刻に使う）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { hashToken, newToken } from '@/lib/attendance';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const code = String(body.code || '').replace(/\D/g, '');
  if (code.length !== 6) return Response.json({ error: '6桁の登録コードを入力してください' }, { status: 400 });
  const db = getSupabase();
  const { data: device } = await db.from('provider_attendance_devices')
    .select('id, provider_id, name, pairing_expires_at, revoked_at')
    .eq('pairing_code', code).is('token_hash', null).is('revoked_at', null).maybeSingle();
  if (!device || !device.pairing_expires_at || new Date(device.pairing_expires_at) < new Date()) {
    return Response.json({ error: '登録コードが正しくないか、有効期限（10分）が切れています。管理画面で発行し直してください' }, { status: 400 });
  }
  const token = newToken();
  const { error } = await db.from('provider_attendance_devices')
    .update({ token_hash: hashToken(token), pairing_code: null, pairing_expires_at: null, paired_at: new Date().toISOString() }).eq('id', device.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ token, device_name: device.name });
}
