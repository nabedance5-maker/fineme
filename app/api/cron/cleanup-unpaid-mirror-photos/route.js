// GET /api/cron/cleanup-unpaid-mirror-photos
// Vercel Cron Job: 毎日 3:00 UTC に、未購入のまま保存期限（expires_at, 既定7日）を過ぎた
// Mirrorセッションの写真だけをStorageから削除する（分析テキスト行自体は残す）。
// paid=trueになったセッションの写真は対象外（app/api/cron/cleanup-mirror-sessions が別途、
// 解約後90日でセッションごと削除する）。
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  const now = new Date().toISOString();

  const { data: targets, error: fetchError } = await db
    .from('mirror_sessions')
    .select('id, photo_path')
    .eq('paid', false)
    .not('photo_path', 'is', null)
    .lt('expires_at', now);

  if (fetchError) {
    console.error('[cron/cleanup-unpaid-mirror-photos] fetch error:', fetchError);
    return Response.json({ error: fetchError.message }, { status: 500 });
  }

  if (!targets?.length) {
    return Response.json({ cleaned: 0, at: now });
  }

  const paths = targets.map(t => t.photo_path).filter(Boolean);
  const { error: removeError } = await db.storage.from('mirror-photos').remove(paths);
  if (removeError) {
    console.error('[cron/cleanup-unpaid-mirror-photos] storage remove error:', removeError);
    // Storage削除が失敗してもDB更新は止めない（ベストエフォート）
  }

  const ids = targets.map(t => t.id);
  const { error: updateError } = await db
    .from('mirror_sessions')
    .update({ photo_path: null })
    .in('id', ids);

  if (updateError) {
    console.error('[cron/cleanup-unpaid-mirror-photos] update error:', updateError);
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  console.log(`[cron/cleanup-unpaid-mirror-photos] cleaned ${ids.length} unpaid session photos`);
  return Response.json({ cleaned: ids.length, at: now });
}
