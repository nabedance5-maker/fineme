// GET  /api/providers/[slug]/register → このお店の会員登録が必要か・ログイン中のお客様は登録済みか・入力の初期値
// POST /api/providers/[slug]/register → 会員登録（無料）。お名前・フリガナ・電話番号などをお店の顧客の基本情報に入れる
// でお要望（2026-10-28）：「店舗ごとに会員登録をする設定に変更。会員になってから、予約やプラン契約ができる」。
// 登録はFinemeのアカウントで行う（ログイン必須）。お店のメンバー一覧にそのまま並ぶ。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { isStoreCustomer, profileFields, upsertProfile } from '@/lib/customer-accounts';
import { logCustomerActivity } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

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
  const { provider, user } = await load(request, slug);
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!user) return Response.json({ error: 'ログインしてから会員登録してください', code: 'login_required' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const f = profileFields(b);
  if (!f.last_name || !f.first_name) return Response.json({ error: 'お名前（姓・名）を入力してください' }, { status: 400 });
  if (!f.phone || !/^\+?\d[\d-]{8,}$/.test(f.phone)) return Response.json({ error: '電話番号を入力してください（例：090-1234-5678）' }, { status: 400 });
  if (!b.agree) return Response.json({ error: '入力した内容をお店に伝えることへの同意が必要です' }, { status: 400 });

  const already = await isStoreCustomer(provider.id, user.id);
  await upsertProfile(provider.id, user.id, { ...f, email: realEmail(user) }, 'お客様が会員登録');
  // アカウント側の名前・電話が空なら入れておく（予約はアカウントの情報で行うため）
  const { data: prof } = await supabase.from('profiles').select('last_name, first_name, phone').eq('id', user.id).maybeSingle();
  const patch = Object.fromEntries([['last_name', f.last_name], ['first_name', f.first_name], ['phone', f.phone]].filter(([k]) => !prof?.[k]));
  if (Object.keys(patch).length) await supabase.from('profiles').update(patch).eq('id', user.id);
  if (!already) {
    try { await logCustomerActivity({ providerId: provider.id, userId: user.id, name: `${f.last_name} ${f.first_name}`, label: 'お客様が会員登録', category: '顧客' }); } catch {}
  }
  return Response.json({ ok: true, registered: true });
}
