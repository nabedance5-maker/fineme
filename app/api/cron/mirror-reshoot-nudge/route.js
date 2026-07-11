// GET /api/cron/mirror-reshoot-nudge
// D-20260711-1：Mirror ¥500 購入者へ、購入14日後・30日後に「再撮影ナッジ」を送る。
// 2枚目→前回との変化比較→毎月の変化比較(¥780サブスク＝継続価値)へ接続し、subscriber#1 を取りに行く。
// 日次起動。送信済みは reshoot_nudge_14_at / reshoot_nudge_30_at で記録し重複送信を防ぐ。
// ⚠️ 前提：supabase-reshoot-nudge.sql を本番Supabaseに適用済みであること（未適用なら安全にスキップ）。
import { getSupabase } from '@/lib/supabase';
import { sendMirrorReshootNudgeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fineme.me';

// phase: '14' or '30'
async function runPhase(db, phase, mirrorUrl) {
  const days = phase === '30' ? 30 : 14;
  const col = phase === '30' ? 'reshoot_nudge_30_at' : 'reshoot_nudge_14_at';
  const now = Date.now();
  // days〜days+1日前に購入した、有料・ユーザー紐付き・未通知のセッション
  const from = new Date(now - (days + 1) * 86400000).toISOString();
  const to = new Date(now - days * 86400000).toISOString();

  const { data: sessions, error } = await db
    .from('mirror_sessions')
    .select('id, user_id, created_at')
    .eq('paid', true)
    .not('user_id', 'is', null)
    .is(col, null)
    .gte('created_at', from)
    .lte('created_at', to);

  if (error) {
    // 列が無い＝SQL未適用。安全にスキップ（毎日エラーで騒がない）。
    if (/column .*does not exist|reshoot_nudge/.test(error.message)) {
      return { phase, skipped: 'migration_pending' };
    }
    return { phase, error: error.message };
  }
  if (!sessions || sessions.length === 0) return { phase, sent: 0 };

  let sent = 0;
  for (const s of sessions) {
    try {
      const { data: { user } = {}, error: uErr } = await db.auth.admin.getUserById(s.user_id);
      if (uErr || !user?.email) continue;
      await sendMirrorReshootNudgeEmail({ to: user.email, mirrorUrl, phase });
      await db.from('mirror_sessions').update({ [col]: new Date().toISOString() }).eq('id', s.id);
      sent++;
    } catch (e) {
      console.error('[mirror-reshoot-nudge]', phase, s.id, e.message);
    }
  }
  return { phase, sent };
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  const mirrorUrl = `${SITE_URL}/mirror`;
  const r14 = await runPhase(db, '14', mirrorUrl);
  const r30 = await runPhase(db, '30', mirrorUrl);
  return Response.json({ ok: true, results: [r14, r30] });
}
