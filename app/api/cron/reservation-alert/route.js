// GET /api/cron/reservation-alert
// Vercel Cron: 毎日 15:00 UTC（0:00 JST）
// pending 状態のまま24時間以上経過した予約を掲載者に通知する
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();

  // 24時間以上前に作成された pending 予約（まだアラート未送信）を取得
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: reservations, error } = await db
    .from('reservations')
    .select('id, provider_id, user_name, reserved_date, start_time, created_at')
    .eq('status', 'pending')
    .eq('unanswered_alert_sent', false)
    .lt('created_at', cutoff);

  if (error) {
    console.error('[cron/reservation-alert] fetch error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!reservations?.length) {
    return Response.json({ sent: 0 });
  }

  // 掲載者情報を一括取得
  const providerIds = [...new Set(reservations.map(r => r.provider_id))];
  const { data: providers } = await db
    .from('providers')
    .select('id, name, line_user_id')
    .in('id', providerIds);
  const providerMap = Object.fromEntries((providers || []).map(p => [p.id, p]));

  let sent = 0;
  const results = [];

  for (const r of reservations) {
    const provider = providerMap[r.provider_id];

    if (provider?.line_user_id) {
      const msg = [
        '【Fineme】未確認の予約があります',
        `${r.user_name} さんから予約リクエストが届いてから24時間が経過しています。`,
        `予約日：${r.reserved_date}${r.start_time ? ' ' + r.start_time : ''}`,
        '',
        '早めにご確認・承認または辞退をお願いします。',
        'ダッシュボード：https://www.fineme.me/provider/dashboard',
      ].join('\n');

      const result = await sendLinePush(provider.line_user_id, msg);
      if (result.ok) sent++;
      results.push({ reservation_id: r.id, provider_id: r.provider_id, ok: result.ok });
    }

    // 送信済みフラグを立てる（成否に関わらず重複送信防止）
    await db
      .from('reservations')
      .update({ unanswered_alert_sent: true })
      .eq('id', r.id);
  }

  console.log(`[cron/reservation-alert] checked=${reservations.length} sent=${sent}`);
  return Response.json({ sent, checked: reservations.length, results });
}
