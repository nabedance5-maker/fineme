// GET /api/cron/cleanup-activity-logs
// Vercel Cron Job: 毎日 4:00 UTC に、1年より古い操作ログを削除（テーブルが増え続けるのを防ぐ）
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const RETENTION_DAYS = 365;

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = getSupabase();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
  const { error, count } = await db.from('provider_activity_logs')
    .delete({ count: 'exact' }).lt('occurred_at', cutoff);
  if (error) {
    console.error('[cron/cleanup-activity-logs]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ deleted: count || 0 });
}
