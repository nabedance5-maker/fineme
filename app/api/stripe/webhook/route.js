// POST /api/stripe/webhook
import { getSupabase } from '@/lib/supabase';
// Stripeイベントを受信してSupabaseを更新する
import Stripe from 'stripe';
import { getPlanByPriceId } from '@/lib/stripe-plans';
import { sendReservationCreatedEmails } from '@/lib/email';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const supabaseAdmin = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return new Response('Stripe is not configured', { status: 503 });

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const providerId = sub.metadata?.fineme_provider_id;
        if (!providerId) break;

        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = getPlanByPriceId(priceId);

        await supabaseAdmin.from('providers').upsert({
          id: providerId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer,
          billing_status: sub.status,
          plan: plan ? Object.keys({ A: true }).find(k => plan === k) || 'A' : 'A',
        }, { onConflict: 'id' });

        console.log(`[webhook] subscription ${sub.status} for provider ${providerId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const providerId = sub.metadata?.fineme_provider_id;
        if (!providerId) break;
        await supabaseAdmin.from('providers')
          .update({ billing_status: 'cancelled' })
          .eq('id', providerId);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const providerId = invoice.subscription_details?.metadata?.fineme_provider_id
          || invoice.metadata?.fineme_provider_id;
        if (!providerId) break;

        // 課金成功 → providers テーブルを active に更新
        await supabaseAdmin.from('providers')
          .update({ billing_status: 'active' })
          .eq('id', providerId);

        // 紹介報酬を計算・記録（月次）
        const yearMonth = new Date().toISOString().slice(0, 7);
        await recordReferralReward(providerId, yearMonth);

        console.log(`[webhook] payment succeeded for provider ${providerId}: ¥${invoice.amount_paid}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const providerId = invoice.subscription_details?.metadata?.fineme_provider_id;
        if (!providerId) break;
        await supabaseAdmin.from('providers')
          .update({ billing_status: 'past_due' })
          .eq('id', providerId);
        break;
      }
    }
  } catch (err) {
    console.error(`[webhook] handler error for ${event.type}:`, err);
  }

  return new Response('ok', { status: 200 });
}

// 紹介報酬の月次記録
async function recordReferralReward(referredId, yearMonth) {
  try {
    // この掲載者を紹介した人を探す
    const { data: referral } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id, reward_per_month')
      .eq('referred_id', referredId)
      .eq('status', 'active')
      .single();

    if (!referral) return;

    // 月次報酬を記録（重複は UNIQUE制約でスキップ）
    await supabaseAdmin.from('referral_rewards').upsert({
      referrer_id: referral.referrer_id,
      referred_id: referredId,
      year_month: yearMonth,
      amount: referral.reward_per_month || 500,
      paid: false,
    }, { onConflict: 'referrer_id,referred_id,year_month', ignoreDuplicates: true });

    console.log(`[webhook] referral reward recorded: ${referral.referrer_id} ← ${referredId} (${yearMonth})`);
  } catch (e) {
    console.warn('[webhook] referral reward error:', e.message);
  }
}
