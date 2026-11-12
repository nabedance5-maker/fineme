// POST /api/provider/account-settings/email-change { new_email, password } → 新しいアドレスに確認リンクを送る（店舗のオーナーのみ）
// 今のパスワードで本人を確かめるので、今のアドレスでの確認は要らない（前のアドレスが使えなくなった時も変えられる）。lib/login-email-change.js
export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { findUserByEmail } from '@/lib/customer-accounts';
import { signEmailChange } from '@/lib/login-email-change';
import { sendLoginEmailChangeEmail } from '@/lib/email';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function __POST(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } = {}, error } = await supabase.auth.getUser(token);
  if (error || !user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: provider } = await supabase.from('providers').select('id, name').eq('email', user.email).single();
  if (!provider) return Response.json({ error: 'ログイン用メールを変えられるのは、店舗のオーナーのアカウントだけです' }, { status: 403 });

  const b = await request.json().catch(() => ({}));
  const newEmail = String(b.new_email || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!EMAIL.test(newEmail) || newEmail.length > 120) return Response.json({ error: 'メールアドレスの形を確かめてください' }, { status: 400 });
  if (newEmail === user.email.toLowerCase()) return Response.json({ error: '今と同じアドレスです' }, { status: 400 });
  if (!password) return Response.json({ error: '今のパスワードを入れてください' }, { status: 400 });

  // 今のパスワードで本人を確かめる（画面を開いたままの他人や、盗まれたログインの印だけでは変えられないように）
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signed, error: pwErr } = await anon.auth.signInWithPassword({ email: user.email, password });
  if (pwErr || signed?.user?.id !== user.id) return Response.json({ error: '今のパスワードが違います' }, { status: 403 });
  await anon.auth.signOut().catch(() => {});

  const [taken, { data: otherStore }] = await Promise.all([
    findUserByEmail(newEmail).catch(() => null),
    supabase.from('providers').select('id').ilike('email', newEmail).maybeSingle(),
  ]);
  if ((taken && taken.id !== user.id) || otherStore) return Response.json({ error: 'このメールアドレスは、ほかのアカウントで使われています' }, { status: 409 });

  const t = signEmailChange({ userId: user.id, oldEmail: user.email, newEmail });
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fineme.me';
  try {
    await sendLoginEmailChangeEmail({ to: newEmail, providerName: provider.name, url: `${site}/api/provider/account-settings/email-change/confirm?t=${encodeURIComponent(t)}` });
  } catch (e) {
    console.error('[email-change] send', e?.message);
    return Response.json({ error: '確認メールを送れませんでした。時間をおいてもう一度お試しください' }, { status: 500 });
  }
  return Response.json({ ok: true });
}
export const POST = withAudit(__POST);
