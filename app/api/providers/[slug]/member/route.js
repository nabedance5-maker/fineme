// GET /api/providers/[slug]/member → ログイン中のお客様が、このお店の会員かどうか
// ※ お客様がお店のページから自分で会員登録する仕組みは廃止（でお指摘 2026-10-22：たまたま見た人がイタズラで登録できてしまう）。
//   会員登録はお店が管理画面（メンバータブ）から行う。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

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
