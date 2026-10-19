// スタッフ個別ログインのAPIで使う共通の認証（でお要望 2026-10-19）
import { getSupabase } from '@/lib/supabase';
import { planLockedResponse } from '@/lib/plan-features';

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

// 入会手続き（会員プラン）系の設定API用：ログイン確認＋プランで入会手続き機能が使えるか
export async function membershipAuth(request) {
  const a = await memberAuth(request);
  if (!a) return { res: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: prov } = await supabase.from('providers').select('id, plan').eq('id', a.provider.id).single();
  const locked = planLockedResponse(prov, 'membership_enrollment');
  return locked ? { res: locked } : { provider: prov, user: a.user };
}
