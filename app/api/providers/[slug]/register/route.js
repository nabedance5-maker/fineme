// GET  /api/providers/[slug]/register → このお店の会員登録が必要か・ログイン中のお客様は登録済みか・入力の初期値
// POST /api/providers/[slug]/register → 会員登録（無料）。お名前・フリガナ・電話番号などをお店の顧客の基本情報に入れる
// でお要望（2026-10-28）：「店舗ごとに会員登録をする設定に変更。会員になってから、予約やプラン契約ができる」。
// 登録はFinemeのアカウントで行う。お店のメンバー一覧にそのまま並ぶ。
// まだFinemeに登録していない方は、この画面でメールアドレスとパスワードを決めてもらい、お店の会員登録と同時に
// Finemeのアカウントも作る（でお・今野さん 2026-10-28：別々にパスワードを作らせない。以後はこのアカウントで本人と分かる）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { isStoreCustomer, profileFields, upsertProfile, findUserByEmail } from '@/lib/customer-accounts';
import { logCustomerActivity } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

async function load(request, slug) {
  const { data: provider } = await supabase.from('providers').select('id, name, slug, require_member_registration').eq('slug', slug).eq('published', true).maybeSingle();
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  const { data: { user } = {} } = token ? await supabase.auth.getUser(token).catch(() => ({ data: {} })) : { data: {} };
  return { provider, user: user || null };
}

const realEmail = u => (u?.email && !u.email.endsWith('@line.fineme.me') && !u.email.endsWith('.invalid') ? u.email : null);

export async function GET(request, { params }) {
  const { slug } = await params;
  const { provider, user } = await load(request, slug);
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });
  const base = { store_name: provider.name, required: !!provider.require_member_registration, logged_in: !!user };
  if (!user) return Response.json({ ...base, registered: false });
  const [registered, { data: cp }, { data: prof }] = await Promise.all([
    isStoreCustomer(provider.id, user.id),
    supabase.from('provider_customer_profiles').select('last_name, first_name, last_name_kana, first_name_kana, phone, birthday').eq('provider_id', provider.id).eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('last_name, first_name, phone, birthday').eq('id', user.id).maybeSingle(),
  ]);
  const pick = k => cp?.[k] || prof?.[k] || '';
  return Response.json({
    ...base, registered,
    prefill: { last_name: pick('last_name'), first_name: pick('first_name'), last_name_kana: cp?.last_name_kana || '', first_name_kana: cp?.first_name_kana || '', phone: pick('phone'), birthday: pick('birthday'), email: realEmail(user) || '' },
  });
}

export async function POST(request, { params }) {
  const { slug } = await params;
  const { provider, user: loggedIn } = await load(request, slug);
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });
  const b = await request.json().catch(() => ({}));
  const f = profileFields(b);
  if (!f.last_name || !f.first_name) return Response.json({ error: 'お名前（姓・名）を入力してください' }, { status: 400 });
  if (!f.phone || !/^\+?\d[\d-]{8,}$/.test(f.phone)) return Response.json({ error: '電話番号を入力してください（例：090-1234-5678）' }, { status: 400 });
  if (!b.agree) return Response.json({ error: '入力した内容をお店に伝えることへの同意が必要です' }, { status: 400 });

  let user = loggedIn;
  if (!user) {
    // Finemeのアカウントも一緒に作る
    const email = String(b.email || '').trim().toLowerCase();
    const password = String(b.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'メールアドレスを正しく入力してください' }, { status: 400 });
    if (password.length < 8) return Response.json({ error: 'パスワードは8文字以上にしてください' }, { status: 400 });
    if (!b.agree_fineme) return Response.json({ error: 'Finemeの利用規約・プライバシーポリシーへの同意が必要です' }, { status: 400 });
    const existing = await findUserByEmail(email);
    if (existing?.last_sign_in_at) {
      return Response.json({ error: 'このメールアドレスはFinemeに登録済みです。ログインしてから会員登録してください', code: 'existing_login' }, { status: 409 });
    }
    if (existing) {
      // お店が追加した・予約の時に作られた、まだ一度もログインしていないアカウント。ここでパスワードを決めると、
      // メールアドレスを知っているだけの他人がその方のチケットや予約を持てるので、本人のメールでパスワードを決めてもらう
      try { await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${BASE}/auth/callback` }); } catch {}
      return Response.json({ error: 'このメールアドレスは、お店でのご予約などでFinemeのアカウントがすでに用意されています。いま届いたメールからパスワードを決めて、ログインしてから会員登録してください', code: 'existing_set_password' }, { status: 409 });
    }
    const { data: created, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { signup_via: 'store_register', provider_slug: provider.slug } });
    if (error) return Response.json({ error: `アカウントを作れませんでした（${error.message}）` }, { status: 400 });
    user = created.user;
  }

  const already = await isStoreCustomer(provider.id, user.id);
  await upsertProfile(provider.id, user.id, { ...f, email: realEmail(user) }, 'お客様が会員登録');
  // アカウント側の名前・電話が空なら入れておく（予約はアカウントの情報で行うため）
  const { data: prof } = await supabase.from('profiles').select('last_name, first_name, phone').eq('id', user.id).maybeSingle();
  const patch = Object.fromEntries([['last_name', f.last_name], ['first_name', f.first_name], ['phone', f.phone]].filter(([k]) => !prof?.[k]));
  if (Object.keys(patch).length) await supabase.from('profiles').update(patch).eq('id', user.id);
  if (!already) {
    try { await logCustomerActivity({ providerId: provider.id, userId: user.id, name: `${f.last_name} ${f.first_name}`, label: 'お客様が会員登録', category: '顧客' }); } catch {}
  }
  return Response.json({ ok: true, registered: true, account_created: !loggedIn });
}
