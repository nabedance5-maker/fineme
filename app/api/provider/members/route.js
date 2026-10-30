// GET  /api/provider/members → スタッフのログイン一覧と、役割ごとの権限
// POST /api/provider/members { email, name, role, staff_id, password? } → スタッフを招待（ログイン情報をメールで送る）
// password はお店が決めた初期パスワード（任意・2026-10-30）。決めた時はメールにパスワードを書かない
// でお要望（2026-10-19）：hacomonoの管理ユーザー・ロールレベル相当。権限はmiddlewareで「アカウント」に限定。
export const dynamic = 'force-dynamic';
import { randomBytes } from 'crypto';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { normalizePerms, ROLE_LABEL } from '@/lib/member-perms';
import { sendMemberInviteEmail } from '@/lib/email';
import { memberAuth as auth } from '@/lib/provider-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.fineme.me';


export async function GET(request) {
  const a = await auth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const [{ data: members }, { data: permRows }] = await Promise.all([
    supabase.from('provider_members').select('id, email, name, role, status, staff_id, invited_at, accepted_at, last_seen_at').eq('provider_id', a.provider.id).order('created_at'),
    supabase.from('provider_role_permissions').select('role, perms').eq('provider_id', a.provider.id),
  ]);
  const permOf = Object.fromEntries((permRows || []).map(r => [r.role, r.perms]));
  return Response.json({
    owner_email: a.provider.email,
    me: a.user.fineme_member ? { id: a.user.fineme_member.id, role: a.user.fineme_member.role } : { role: 'owner' },
    members: members || [],
    perms: { manager: normalizePerms('manager', permOf.manager), staff: normalizePerms('staff', permOf.staff) },
  });
}

async function __POST(request) {
  const a = await auth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim().slice(0, 40);
  const role = body.role === 'manager' ? 'manager' : 'staff';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'メールアドレスを正しく入れてください' }, { status: 400 });
  if (!name) return Response.json({ error: 'お名前を入れてください' }, { status: 400 });
  if (email === String(a.provider.email || '').toLowerCase()) return Response.json({ error: 'お店のアカウントのメールアドレスは使えません' }, { status: 400 });
  // 別の店舗のオーナーのメールも使えない（オーナーとして優先され、スタッフとして入れないため）
  const { data: ownerElsewhere } = await supabase.from('providers').select('id').eq('email', email).limit(1);
  if (ownerElsewhere?.length) return Response.json({ error: 'このメールアドレスは別のお店のアカウントで使われています。別のメールアドレスで招待してください' }, { status: 400 });
  const { data: dup } = await supabase.from('provider_members').select('id, provider_id').ilike('email', email).limit(1);
  if (dup?.length) return Response.json({ error: dup[0].provider_id === a.provider.id ? 'このメールアドレスは既に招待しています' : 'このメールアドレスは別のお店のスタッフとして登録されています' }, { status: 409 });
  let staffId = null;
  if (body.staff_id) {
    const { data: st } = await supabase.from('provider_staff').select('id').eq('id', body.staff_id).eq('provider_id', a.provider.id).maybeSingle();
    staffId = st?.id || null;
  }

  // ログイン用のアカウント。新しい人には初期パスワードを作る（お店が決めた時はそれを使う）。既にアカウントがある人はそのまま使う
  const storePassword = typeof body.password === 'string' && body.password ? body.password : null;
  if (storePassword && (storePassword.length < 8 || !/[A-Za-z]/.test(storePassword) || !/\d/.test(storePassword))) return Response.json({ error: 'パスワードは8文字以上で、英字と数字をまぜてください' }, { status: 400 });
  const password = storePassword || randomBytes(6).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 8) + '7a';
  let newAccount = true;
  const { data: created, error: cErr } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  let userId = created?.user?.id || null;
  if (cErr) {
    if (!/registered|exists/i.test(cErr.message || '')) return Response.json({ error: 'ログインの準備に失敗しました: ' + cErr.message }, { status: 500 });
    newAccount = false;
  }
  const { data: row, error } = await supabase.from('provider_members').insert({
    provider_id: a.provider.id, email, name, role, staff_id: staffId, user_id: userId,
    accepted_at: null,
  }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  try {
    await sendMemberInviteEmail({ to: email, providerName: a.provider.name, memberName: name, roleLabel: ROLE_LABEL[role], password: newAccount && !storePassword ? password : null, passwordByStore: newAccount && !!storePassword, loginUrl: `${SITE}/login?next=/provider/dashboard` });
  } catch (e) {
    return Response.json({ ...row, existing_account: !newAccount, mail_error: true, temp_password: newAccount && !storePassword ? password : null });
  }
  return Response.json({ ...row, existing_account: !newAccount });
}
export const POST = withAudit(__POST);
