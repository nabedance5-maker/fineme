import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

/**
 * POST /api/stripe/create-subscription
 * 掲載者登録時にStripe Customer + Subscription（trial）を作成する
 * 初回予約まで課金は発生しない（trial_end を手動でセット）
 *
 * Body: { providerId, email, displayName, referralCode? }
 */
export async function POST(request) {
  const stripe = getStripe();
  const PLAN_PRICE_ID = process.env.STRIPE_PRICE_ID;
  if (!stripe) return Response.json({ error: 'Stripe は未設定です' }, { status: 503 });

  try {
    const { providerId, email, displayName, referralCode } = await request.json();

    if (!providerId || !email) {
      return Response.json({ error: 'providerId と email は必須です' }, { status: 400 });
    }

    // Stripe Customer 作成
    const customer = await stripe.customers.create({
      email,
      name: displayName || email,
      metadata: {
        fineme_provider_id: String(providerId),
        referral_code: referralCode || '',
      },
    });

    // Subscription 作成（trial_end = 遠い未来 → 初回予約検知時に更新）
    // trial_end を 20年後に設定することで、初回予約前は課金しない
    const trialEnd = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 20;

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: PLAN_PRICE_ID }],
      trial_end: trialEnd,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        fineme_provider_id: String(providerId),
      },
    });

    return Response.json({
      customerId: customer.id,
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (err) {
    console.error('[create-subscription] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
