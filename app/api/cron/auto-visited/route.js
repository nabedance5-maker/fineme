// GET /api/cron/auto-visited
// 予約時間から24時間以上経過した approved 予約を自動的に visited に変更し、
// 初回来店であれば課金を開始する（不正防止: 来店ボタン未押下対策）
// Schedule: "0 */2 * * *"（2時間おきに実行）
import { getSupabase } from '@/lib/supabase';

const INTERNAL_KEY = process.env.CRON_SECRET || process.env.INTERNAL_API_KEY;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

export async function GET(request) {
  const key = request.headers.get('x-internal-key') || new URL(request.url).searchParams.get('key');
  if (key !== INTERNAL_KEY) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getSupabase();

  // 24時間以上前に予約時間が来ていた approved 予約を取得
  const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: reservations, error } = await db
    .from('reservations')
    .select('id, provider_id, reserved_date, start_time, user_name')
    .eq('status', 'approved')
    .lt('reserved_date', threshold.split('T')[0]); // reserved_date が昨日以前

  if (error) {
    console.error('[auto-visited] fetch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!reservations || reservations.length === 0) {
    return Response.json({ processed: 0, message: '対象予約なし' });
  }

  // さらに reserved_date + start_time で24時間超過をチェック
  const now = Date.now();
  const targets = reservations.filter(r => {
    const dateStr = r.reserved_date; // YYYY-MM-DD
    const timeStr = r.start_time || '00:00'; // HH:MM
    const reservedAt = new Date(`${dateStr}T${timeStr}:00+09:00`).getTime();
    return now - reservedAt >= 24 * 60 * 60 * 1000;
  });

  if (targets.length === 0) {
    return Response.json({ processed: 0, message: '24時間未経過のため対象なし' });
  }

  let processed = 0;
  let billingStarted = 0;
  const errors = [];

  for (const reservation of targets) {
    try {
      // visited に更新
      const { error: updateErr } = await db
        .from('reservations')
        .update({ status: 'visited' })
        .eq('id', reservation.id);

      if (updateErr) {
        errors.push({ id: reservation.id, error: updateErr.message });
        continue;
      }

      console.log(`[auto-visited] reservation ${reservation.id} → visited (provider: ${reservation.provider_id})`);
      processed++;

      // 掲載者の課金状態を確認
      const { data: provider } = await db
        .from('providers')
        .select('stripe_subscription_id, billing_started, plan, name')
        .eq('id', reservation.provider_id)
        .single();

      if (!provider) continue;
      if (provider.billing_started || provider.plan === 'free') continue;

      // 初回来店 → 課金開始
      if (provider.stripe_subscription_id) {
        const activateRes = await fetch(`${BASE_URL}/api/stripe/activate-billing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stripeSubscriptionId: provider.stripe_subscription_id,
            providerId: reservation.provider_id,
          }),
        });
        if (!activateRes.ok) {
          const err = await activateRes.json();
          console.error(`[auto-visited] activate-billing failed for provider ${reservation.provider_id}:`, err);
        }
      }

      await db
        .from('providers')
        .update({ billing_started: new Date().toISOString() })
        .eq('id', reservation.provider_id);

      console.log(`[auto-visited] billing started for provider ${reservation.provider_id} (${provider.name})`);
      billingStarted++;
    } catch (e) {
      console.error(`[auto-visited] error for reservation ${reservation.id}:`, e);
      errors.push({ id: reservation.id, error: e.message });
    }
  }

  return Response.json({
    processed,
    billing_started: billingStarted,
    errors: errors.length > 0 ? errors : undefined,
  });
}
