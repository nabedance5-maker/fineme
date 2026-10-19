// スタッフ個別ログインのAPIで使う共通の認証（でお要望 2026-10-19）
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

// ログイン中の人が属する店舗（オーナーでもスタッフでも同じ店舗が返る）と、ユーザー情報
export async function memberAuth(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: provider } = await supabase.from('providers').select('id, name, email').eq('email', user.email).single();
  return provider ? { provider, user } : null;
}
