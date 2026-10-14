// 勤怠APIの認証：管理画面（店舗ログイン）と、店頭タブレット（登録済み端末のトークン）
import { getSupabase } from './supabase.js';
import { planLockedResponse } from './plan-features.js';
import { hashToken } from './attendance.js';

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
