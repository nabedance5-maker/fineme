// POST /api/demo/start { code } → 営業用のデモ店舗に入る（2026-11-14）。
// 招待コードが有効なら、デモ店舗のログインを発行して返す（パスワードは誰にも渡さない）。
// - コードはハッシュで照らし合わせる（DBにコードそのものは無い）
// - 同じ接続元からの失敗は15分で10回、入室は1時間で30回まで（総当たり・使い回し対策。IPはハッシュのみ保存）
// - 発行するのはデモ店舗（demo.fineme.me）のログインだけ。中身は架空で、毎晩元に戻り、ログインも切れる
export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { DEMO_STORE_EMAIL } from '@/lib/demo';

const sha = s => crypto.createHash('sha256').update(s).digest('hex');

export async function POST(request) {
  const db = getSupabase();
  let body = {};
  try { body = await request.json(); } catch {}
  const code = String(body.code || '').trim().toUpperCase();
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const ipHash = sha(`demo:${ip}:${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`).slice(0, 32);

  const since15 = new Date(Date.now() - 15 * 60000).toISOString();
  const since60 = new Date(Date.now() - 60 * 60000).toISOString();
  const [fails, oks] = await Promise.all([
    db.from('demo_logins').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).eq('ok', false).gte('created_at', since15),
    db.from('demo_logins').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).eq('ok', true).gte('created_at', since60),
  ]);
  if ((fails.count || 0) >= 10 || (oks.count || 0) >= 30) {
    return Response.json({ error: '試行が多すぎます。しばらくおいてからお試しください' }, { status: 429 });
  }

  if (!/^[A-Z0-9-]{6,40}$/.test(code)) {
    await db.from('demo_logins').insert({ ip_hash: ipHash, ok: false });
    return Response.json({ error: '招待コードが正しくありません' }, { status: 403 });
  }
  const { data: invite } = await db.from('demo_invites').select('id, active, use_count').eq('code_hash', sha(code)).maybeSingle();
  if (!invite?.active) {
    await db.from('demo_logins').insert({ ip_hash: ipHash, ok: false, invite_id: invite?.id || null });
    return Response.json({ error: invite ? 'この招待コードは使えなくなっています' : '招待コードが正しくありません' }, { status: 403 });
  }

  const { data: store } = await db.from('providers').select('id').eq('is_demo', true).maybeSingle();
  if (!store) return Response.json({ error: 'デモ店舗を準備中です。しばらくおいてからお試しください' }, { status: 503 });

  // ログインの発行：管理者の権限でログイン用のリンクを作り（メールは送られない）、その場で使ってセッションに換える
  const { data: link, error: linkErr } = await db.auth.admin.generateLink({ type: 'magiclink', email: DEMO_STORE_EMAIL });
  if (linkErr || !link?.properties?.hashed_token) {
    console.error('[demo/start] generateLink', linkErr?.message);
    return Response.json({ error: 'デモに入れませんでした。もう一度お試しください' }, { status: 502 });
  }
  const tmp = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: verified, error: vErr } = await tmp.auth.verifyOtp({ type: 'email', token_hash: link.properties.hashed_token });
  const s = verified?.session;
  if (vErr || !s) {
    console.error('[demo/start] verifyOtp', vErr?.message);
    return Response.json({ error: 'デモに入れませんでした。もう一度お試しください' }, { status: 502 });
  }

  await Promise.all([
    db.from('demo_invites').update({ use_count: (invite.use_count || 0) + 1, last_used_at: new Date().toISOString() }).eq('id', invite.id),
    db.from('demo_logins').insert({ ip_hash: ipHash, ok: true, invite_id: invite.id }),
  ]);
  return Response.json({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at });
}
