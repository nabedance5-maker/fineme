// GET /api/subscription/status
// ログインユーザーのサブスク状態と今月のMirror無料残回数を返す
import { getSupabase } from '@/lib/supabase';

export async function GET(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await getSupabase().auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await getSupabase()
    .from('profiles')
    .select('subscription_status, subscription_period_end, mirror_monthly_free_count, mirror_monthly_free_month')
    .eq('id', user.id)
    .single();

  const isActive = profile?.subscription_status === 'active';

  // 今月の無料Mirror残回数（JST月ベース）
  let mirrorFreeRemaining = 0;
  if (isActive) {
    const MAX_FREE = 3;
    const jst = (d) => new Date(new Date(d).getTime() + 9 * 3600000);
    const nowJST = jst(new Date());
    const currentMonth = `${nowJST.getFullYear()}-${String(nowJST.getMonth() + 1).padStart(2, '0')}`;

    const storedMonth = profile?.mirror_monthly_free_month;
    const storedCount = storedMonth === currentMonth ? (profile?.mirror_monthly_free_count || 0) : 0;
    mirrorFreeRemaining = Math.max(0, MAX_FREE - storedCount);
  }

  return Response.json({
    isActive,
    status:               profile?.subscription_status || null,
    periodEnd:            profile?.subscription_period_end || null,
    mirrorFreeRemaining,
    mirrorFreeAvailable:  mirrorFreeRemaining > 0, // 後方互換
  });
}
