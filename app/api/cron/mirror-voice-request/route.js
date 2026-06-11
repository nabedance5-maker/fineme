// GET /api/cron/mirror-voice-request
// 毎時起動：Mirror ¥500 購入から23〜25時間経過・未通知セッションにメールを送る
import { getSupabase } from '@/lib/supabase';
import { sendMirrorVoiceRequestEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fineme.me';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();

  // 23〜25時間前に作成された、有料・ユーザー紐付き・未通知のセッションを取得
  const now = new Date();
  const from = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
  const to   = new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString();

  const { data: sessions, error } = await db
    .from('mirror_sessions')
    .select('id, user_id, created_at')
    .eq('paid', true)
    .not('user_id', 'is', null)
    .is('voice_requested_at', null)
    .gte('created_at', from)
    .lte('created_at', to);

  if (error) {
    console.error('[mirror-voice-request] DB error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!sessions || sessions.length === 0) {
    return Response.json({ sent: 0 });
  }

  let sent = 0;
  const errors = [];

  for (const session of sessions) {
    try {
      // Supabase Auth からメールアドレスを取得
      const { data: { user }, error: userError } = await db.auth.admin.getUserById(session.user_id);
      if (userError || !user?.email) continue;

      const feedbackUrl = `${SITE_URL}/feedback/mirror?sid=${session.id}`;
      await sendMirrorVoiceRequestEmail({ to: user.email, feedbackUrl });

      // 送信済みマークを記録
      await db
        .from('mirror_sessions')
        .update({ voice_requested_at: new Date().toISOString() })
        .eq('id', session.id);

      sent++;
    } catch (e) {
      errors.push({ session_id: session.id, error: e.message });
      console.error('[mirror-voice-request] failed for session', session.id, e.message);
    }
  }

  console.log(`[mirror-voice-request] sent=${sent} errors=${errors.length}`);
  return Response.json({ sent, errors });
}
