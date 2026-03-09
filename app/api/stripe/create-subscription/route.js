// POST /api/stripe/create-subscription
// 掲載者登録時にStripe Customer + Subscription（trial）を作成
// 初回予約まで課金は発生しない（trial_end を遠い未来に設定）
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { PLANS } from '@/lib/stripe-plans';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripe は未設定です' }, { status: 503 });

  try {
    const { providerId, email, displayName, plan = 'A', referralCode } = await request.json();

    if (!providerId || !email) {
      return Response.json({ error: 'providerId と email は必須です' }, { status: 400 });
    }

    const planConfig = PLANS[plan] || PLANS['A'];

    // Stripe Customer 作成
    const customer = await stripe.customers.create({
      email,
      name: displayName || email,
      metadata: {
        fineme_provider_id: String(providerId),
        referral_code: referralCode || '',
      },
    });

    // Subscription 作成（trial_end = 20年後 → 初回予約検知時に即時課金に切り替え）
    const trialEnd = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 20;
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: planConfig.price_id }],
      trial_end: trialEnd,
      payment_behavior: 'default_incomplete',
      metadata: { fineme_provider_id: String(providerId) },
    });

    // Supabase providers テーブルに保存
    await supabaseAdmin.from('providers').upsert({
      id: String(providerId),
      email,
      name: displayName || email,
      plan,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      billing_status: 'trialing',
    }, { onConflict: 'id' });

    return Response.json({
      customerId: customer.id,
      subscriptionId: subscription.id,
      status: subscription.status,
      plan,
      planAmount: planConfig.amount,
    });
  } catch (err) {
    console.error('[create-subscription]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
