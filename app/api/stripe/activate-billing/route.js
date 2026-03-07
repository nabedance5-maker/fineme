import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

/**
 * POST /api/stripe/activate-billing
 * 初回予約発生時に呼び出す → trial終了 → 当月から課金開始
 *
 * Body: { stripeSubscriptionId, providerId }
 */
export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripe は未設定です' }, { status: 503 });

  try {
    const { stripeSubscriptionId, providerId } = await request.json();

    if (!stripeSubscriptionId) {
      return Response.json({ error: 'stripeSubscriptionId は必須です' }, { status: 400 });
    }

    // trial_end を今すぐに設定 → 即時課金開始
    const subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      trial_end: 'now',
    });

    console.log(`[activate-billing] provider ${providerId} billing started. sub: ${stripeSubscriptionId}`);

    return Response.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    });
  } catch (err) {
    console.error('[activate-billing] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
