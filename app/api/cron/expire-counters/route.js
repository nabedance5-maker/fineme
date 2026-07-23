// GET /api/cron/expire-counters
// Vercel Cron Job: 1時間ごとに期限切れ代替提案を自動キャンセル
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Vercel Cron の認証（CRON_SECRET 環境変数で保護）
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  const now = new Date().toISOString();

  try {
    // 期限切れの counter_proposed を cancelled に変更
    const { data, error } = await db
      .from('reservations')
      .update({ status: 'cancelled', counter_expires_at: null })
      .eq('status', 'counter_proposed')
      .lt('counter_expires_at', now)
      .select('id, user_name, user_contact');

    if (error) {
      console.error('[cron/expire-counters]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const count = data?.length || 0;
    console.log(`[cron/expire-counters] expired ${count} counter-proposals`);
    return Response.json({ expired: count, at: now });
  } catch (e) {
    console.error('[cron/expire-counters] unexpected error', e);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}
