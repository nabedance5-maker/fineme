// POST /api/stripe/webhook
// Stripeイベントを受信してSupabaseを更新する
// billing_status: free → active（payment_succeeded）/ cancelled / past_due
import { getSupabase } from '@/lib/supabase';
import Stripe from 'stripe';
import { getPlanKeyByPriceId } from '@/lib/stripe-plans';
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
        const planKey = getPlanKeyByPriceId(priceId);

        await supabaseAdmin.from('providers').upsert({
          id: providerId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer,
          billing_status: sub.status,
          plan: planKey,
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
        await recordReferralReward(providerId, yearMonth, invoice.amount_paid);

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
// ストック型紹介報酬の仕様（でお確定）：
//   ①初月：紹介した掲載店舗の初回課金額の90%を成果報酬としてキャッシュバック
//   ②継続：その掲載店舗が掲載を続ける限り、1社につき月¥500をストック報酬として支払う
async function recordReferralReward(referredId, yearMonth, invoiceAmount) {
  try {
    // この掲載者を紹介した人を探す
    const { data: referral } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id, reward_per_month')
      .eq('referred_id', referredId)
      .eq('status', 'active')
      .single();

    if (!referral) return;

    // この紹介ペアで過去に報酬記録が無ければ「初月」＝①成果報酬90%を適用
    const { count } = await supabaseAdmin
      .from('referral_rewards')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', referral.referrer_id)
      .eq('referred_id', referredId);

    const isFirstMonth = !count;
    const amount = isFirstMonth
      ? Math.round((invoiceAmount || 0) * 0.9)
      : (referral.reward_per_month || 500);

    // 月次報酬を記録（重複は UNIQUE制約でスキップ）
    await supabaseAdmin.from('referral_rewards').upsert({
      referrer_id: referral.referrer_id,
      referred_id: referredId,
      year_month: yearMonth,
      amount,
      is_first_month: isFirstMonth,
      paid: false,
    }, { onConflict: 'referrer_id,referred_id,year_month', ignoreDuplicates: true });

    console.log(`[webhook] referral reward recorded: ${referral.referrer_id} ← ${referredId} (${yearMonth}, ¥${amount}${isFirstMonth ? ' ※初月90%成果報酬' : ' ※継続ストック'})`);
  } catch (e) {
    console.warn('[webhook] referral reward error:', e.message);
  }
}
