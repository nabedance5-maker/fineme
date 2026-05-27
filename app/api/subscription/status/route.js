// GET /api/subscription/status
// ログインユーザーのサブスク状態と月1無料Mirror残数を返す
import { getSupabase } from '@/lib/supabase';

export async function GET(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await getSupabase().auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await getSupabase()
    .from('profiles')
    .select('subscription_status, subscription_period_end, mirror_monthly_free_used_at')
    .eq('id', user.id)
    .single();

  const isActive = profile?.subscription_status === 'active';

  // 今月の無料Mirror使用済みか判定（JST月ベース）
  let mirrorFreeAvailable = false;
  if (isActive) {
    const usedAt = profile?.mirror_monthly_free_used_at;
    if (!usedAt) {
      mirrorFreeAvailable = true;
    } else {
      const jst = (d) => new Date(new Date(d).getTime() + 9 * 3600000);
      const now  = jst(new Date());
      const used = jst(usedAt);
      const sameMonth = now.getFullYear() === used.getFullYear()
        && now.getMonth() === used.getMonth();
      mirrorFreeAvailable = !sameMonth;
    }
  }

  return Response.json({
    isActive,
    status:              profile?.subscription_status || null,
    periodEnd:           profile?.subscription_period_end || null,
    mirrorFreeAvailable,
  });
}
