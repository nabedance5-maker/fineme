// GET/POST/PATCH /api/admin/demo-invites → 営業用のデモの招待コードを管理する（admin専用・2026-11-14）
// POST { label } → 新しいコードを作る（コードはこの1回だけ返す。DBにはハッシュだけ残る）
// POST { action: 'reset' } → デモ店舗を今すぐ元の状態に戻す（毎晩の作り直しと同じ）
// PATCH { id, active } → コードを止める・戻す
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
    db.from('demo_invites').select('id, label, code_hint, active, use_count, last_used_at, created_at').order('created_at', { ascending: false }),
    db.from('providers').select('id, name').eq('is_demo', true).maybeSingle(),
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ invites: data || [], store: store.data || null });
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
  const code = newCode();
  const { data, error } = await db.from('demo_invites').insert({ label, code_hash: sha(code), code_hint: code.slice(-4) }).select('id').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ id: data.id, code });
}

export async function PATCH(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.id || typeof body.active !== 'boolean') return Response.json({ error: 'id と active が必要です' }, { status: 400 });
  const { error } = await getSupabase().from('demo_invites').update({ active: body.active }).eq('id', body.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
