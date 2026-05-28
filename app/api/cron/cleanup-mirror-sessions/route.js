// GET /api/cron/cleanup-mirror-sessions
// Vercel Cron Job: 毎日 2:00 UTC に解約後3ヶ月経過ユーザーの Mirror セッションを削除
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // 解約後3ヶ月以上経過したユーザーIDを取得
  const { data: profiles, error: profilesError } = await db
    .from('profiles')
    .select('id')
    .eq('subscription_status', 'canceled')
    .not('subscription_cancelled_at', 'is', null)
    .lt('subscription_cancelled_at', threeMonthsAgo);

  if (profilesError) {
    console.error('[cron/cleanup-mirror-sessions] profiles query error:', profilesError);
    return Response.json({ error: profilesError.message }, { status: 500 });
  }

  if (!profiles?.length) {
    return Response.json({ deleted: 0, at: new Date().toISOString() });
  }

  const userIds = profiles.map(p => p.id);

  const { error: deleteError, count } = await db
    .from('mirror_sessions')
    .delete({ count: 'exact' })
    .in('user_id', userIds);

  if (deleteError) {
    console.error('[cron/cleanup-mirror-sessions] delete error:', deleteError);
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  console.log(`[cron/cleanup-mirror-sessions] deleted ${count} sessions for ${userIds.length} users`);
  return Response.json({ deleted: count ?? 0, users: userIds.length, at: new Date().toISOString() });
}
