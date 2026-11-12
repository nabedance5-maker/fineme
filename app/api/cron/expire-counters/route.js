// GET /api/cron/expire-counters
// Vercel Cron Job: 1時間ごとに期限切れ代替提案を自動キャンセル
import { getSupabase } from '@/lib/supabase';
import { sendReservationCancelledEmail, sendCancelledByUserEmail } from '@/lib/email';
import { notifyCustomerLine } from '@/lib/reservation-notify';
import { refundDepositIfPaid } from '@/lib/reservation-deposit';
import { providerRecipients } from '@/lib/provider-recipients';

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
      .select('*');

    if (error) {
      console.error('[cron/expire-counters]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // 期限切れのキャンセルを、お客様とお店の両方に知らせる（2026-11-12 渡邉報告：キャンセルのメールが届かないことがある。
    // ここではどちらにも何も送っていなかった）。支払い済みのデポジットも、ほかのキャンセルと同じく返金する
    const pids = [...new Set((data || []).map(r => r.provider_id))];
    const { data: provs } = pids.length ? await db.from('providers').select('id, name, email, notify_emails').in('id', pids) : { data: [] };
    const byId = Object.fromEntries((provs || []).map(p => [p.id, p]));
    for (const r of data || []) {
      const p = byId[r.provider_id];
      try { await refundDepositIfPaid(db, r); } catch (e) { console.error('[cron/expire-counters] refund', r.id, e?.message); }
      try { await sendReservationCancelledEmail({ reservation: r, providerName: p?.name, reason: 'expired' }); } catch (e) { console.error('[cron/expire-counters] customer email', r.id, e?.message); }
      try { await sendCancelledByUserEmail({ reservation: r, providerEmail: providerRecipients(p), providerName: p?.name, expired: true }); } catch (e) { console.error('[cron/expire-counters] store email', r.id, e?.message); }
      await notifyCustomerLine(db, { userId: r.user_id, providerId: r.provider_id, message: `【${p?.name || '店舗'}】代替日時へのお返事の期限が過ぎたため、予約リクエストはキャンセルになりました。ご希望の場合はもう一度ご予約ください。` }).catch(e => console.error('[cron/expire-counters] line', r.id, e?.message));
    }

    const count = data?.length || 0;
    console.log(`[cron/expire-counters] expired ${count} counter-proposals`);
    return Response.json({ expired: count, at: now });
  } catch (e) {
    console.error('[cron/expire-counters] unexpected error', e);
    return Response.json({ error: 'internal_error' }, { status: 500 });
  }
}
