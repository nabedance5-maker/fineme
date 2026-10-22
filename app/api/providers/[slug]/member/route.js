// GET  /api/providers/[slug]/member → ログイン中のお客様が、このお店の会員かどうか
// POST /api/providers/[slug]/member → お客様がお店のページから会員登録する（でお要望 2026-10-22）
//   お店が先に登録していた（確認待ちの）場合は、ここでご本人が確認して有効になる。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { profileFields, upsertProfile } from '@/lib/store-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function userOf(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } = {} } = await supabase.auth.getUser(token).catch(() => ({ data: {} }));
  return user || null;
}

export async function GET(request, { params }) {
  const { slug } = await params;
  const { data: provider } = await supabase.from('providers').select('id').eq('slug', slug).eq('published', true).maybeSingle();
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });
  const user = await userOf(request);
  if (!user) return Response.json({ logged_in: false, status: null });
  const [{ data: m }, { data: p }] = await Promise.all([
    supabase.from('provider_store_members').select('status, joined_at').eq('provider_id', provider.id).eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('last_name, first_name, phone').eq('id', user.id).maybeSingle(),
  ]);
  return Response.json({ logged_in: true, status: m?.status || null, joined_at: m?.joined_at || null, prefill: p || {} });
}

export async function POST(request, { params }) {
  const { slug } = await params;
  const { data: provider } = await supabase.from('providers').select('id').eq('slug', slug).eq('published', true).maybeSingle();
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });
  const user = await userOf(request);
  if (!user) return Response.json({ error: 'Finemeにログインしてから会員登録してください', code: 'login_required' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const f = profileFields(b);
  if (!f.last_name || !f.first_name || !f.phone) return Response.json({ error: 'お名前と電話番号を入れてください' }, { status: 400 });
  if (!b.agree) return Response.json({ error: 'お店にお名前・連絡先を伝えることへの同意が必要です' }, { status: 400 });
  const { data: cur } = await supabase.from('provider_store_members').select('id, status').eq('provider_id', provider.id).eq('user_id', user.id).maybeSingle();
  if (cur?.status === 'active') return Response.json({ ok: true, status: 'active' });
  const row = { provider_id: provider.id, user_id: user.id, status: 'active', joined_at: new Date().toISOString(), withdrawn_at: null };
  const { error } = cur
    ? await supabase.from('provider_store_members').update(row).eq('id', cur.id)
    : await supabase.from('provider_store_members').insert({ ...row, registered_by: 'online' });
  if (error) return Response.json({ error: '会員登録できませんでした' }, { status: 500 });
  await upsertProfile(provider.id, user.id, { ...f, email: user.email || null }, 'お客様が会員登録');
  return Response.json({ ok: true, status: 'active' }, { status: 201 });
}
