// GET/POST/PATCH /api/admin/demo-invites → 営業用のデモの招待コードを管理する（admin専用・2026-11-14）
// POST { label } → 新しいコードを作る（コードはこの1回だけ返す。DBにはハッシュだけ残る）
// POST { action: 'reset' } → デモ店舗を今すぐ元の状態に戻す（毎晩の作り直しと同じ）
// PATCH { id, active } → コードを止める・戻す
// PATCH { id, expires_days } → 期限を今日から N 日に変える（0 で期限なし）。2026-11-15
// 営業メールでは、一斉送信1回ごとに1つのコードを作り、期限（既定14日）を付ける。入口で書いてもらった店舗名は entries で返す
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import crypto from 'crypto';
import { getSupabase } from '@/lib/supabase';
import { resetDemo } from '@/lib/demo-seed';

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';
function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return !!ADMIN_KEY && key === ADMIN_KEY;
}
const daysFromNow = n => new Date(Date.now() + n * 86400000).toISOString();
const parseDays = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= 0 && n <= 365 ? n : null; };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  const b = crypto.randomBytes(8);
  const s = Array.from(b, x => ALPHA[x % ALPHA.length]).join('');
  return `DEMO-${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabase();
  const [{ data, error }, store] = await Promise.all([
    db.from('demo_invites').select('id, label, code_hint, active, use_count, last_used_at, created_at, expires_at').order('created_at', { ascending: false }),
    db.from('providers').select('id, name').eq('is_demo', true).maybeSingle(),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  // 入った記録（直近200件）。店舗名は入口でご本人が任意で書いたもの
  const { data: logins } = await db.from('demo_logins').select('invite_id, store_name, created_at').eq('ok', true).order('created_at', { ascending: false }).limit(200);
  return Response.json({ invites: data || [], store: store.data || null, entries: logins || [] });
}

export async function POST(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabase();
  const body = await request.json().catch(() => ({}));
  if (body.action === 'reset') {
    try { return Response.json({ ok: true, ...(await resetDemo(db)) }); } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
  }
  const label = String(body.label || '').trim().slice(0, 60);
  if (!label) return Response.json({ error: '誰に渡すコードか（名前）を入れてください' }, { status: 400 });
  const days = body.expires_days === undefined || body.expires_days === '' ? 0 : parseDays(body.expires_days);
  if (days === null) return Response.json({ error: '期限は0〜365日で入れてください（0は期限なし）' }, { status: 400 });
  const code = newCode();
  const expires_at = days ? daysFromNow(days) : null;
  const { data, error } = await db.from('demo_invites').insert({ label, code_hash: sha(code), code_hint: code.slice(-4), expires_at }).select('id').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id, code, expires_at });
}

export async function PATCH(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const update = {};
  if (typeof body.active === 'boolean') update.active = body.active;
  if (body.expires_days !== undefined) {
    const days = parseDays(body.expires_days);
    if (days === null) return Response.json({ error: '期限は0〜365日で入れてください（0は期限なし）' }, { status: 400 });
    update.expires_at = days ? daysFromNow(days) : null;
  }
  if (!body.id || !Object.keys(update).length) return Response.json({ error: 'id と、active か expires_days が必要です' }, { status: 400 });
  const { error } = await getSupabase().from('demo_invites').update(update).eq('id', body.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
