import Stripe from 'stripe';
import { queryOne } from '@/lib/db-server';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) {
    return Response.json({ error: 'Stripe は未設定です' }, { status: 503 });
  }

  try {
    const { providerId } = await request.json();
    if (!providerId) {
      return Response.json({ error: 'providerId は必須です' }, { status: 400 });
    }

    const provider = await queryOne(
      'SELECT stripeCustomerId FROM providers WHERE id=?',
      [providerId]
    );

    if (!provider?.stripeCustomerId) {
      return Response.json(
        { error: 'Stripe Customer ID が見つかりません。管理者にお問い合わせください。' },
        { status: 404 }
      );
    }

    const returnUrl = `${request.headers.get('origin') || 'https://fineme.jp'}/pages/provider/billing.html`;
    const session = await stripe.billingPortal.sessions.create({
      customer: provider.stripeCustomerId,
      return_url: returnUrl,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[portal-session] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
