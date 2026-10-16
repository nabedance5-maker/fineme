// GET  /api/provider/attendance/devices → 打刻用端末の一覧
// POST /api/provider/attendance/devices → 端末を追加し、端末で入力する（またはQRで読み取る）6桁の登録コード（10分有効）を発行
export const dynamic = 'force-dynamic';
import { providerFromRequest, requireAttendanceAdmin } from '@/lib/attendance-auth';
import { newPairingCode } from '@/lib/attendance';
import { withAudit } from '@/lib/activity-log';

export async function GET(request) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  const { data } = await db.from('provider_attendance_devices').select('id, name, created_at, paired_at, last_used_at, revoked_at, pairing_expires_at')
    .eq('provider_id', provider.id).order('created_at', { ascending: false });
  return Response.json(data || []);
}

async function __POST(request) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  // 自宅のスマホ等を勝手に打刻用にされないよう、端末の登録は勤怠の管理者だけ
  const gate = await requireAttendanceAdmin(db, provider, request);
  if (gate.error) return gate.error;
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '打刻用の端末').trim().slice(0, 40) || '打刻用の端末';
  // まだ登録されていない古いコードは無効にしてから発行する
  await db.from('provider_attendance_devices').update({ pairing_code: null, pairing_expires_at: null }).eq('provider_id', provider.id).is('token_hash', null);
  const code = newPairingCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { data, error: insErr } = await db.from('provider_attendance_devices')
    .insert({ provider_id: provider.id, name, pairing_code: code, pairing_expires_at: expires }).select('id, name').single();
  if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
  return Response.json({ ...data, pairing_code: code, pairing_expires_at: expires });
}
export const POST = withAudit(__POST);
