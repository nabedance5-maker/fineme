// POST /api/subscription/webhook
// Stripeからのサブスクリプション状態変更を受け取りDBに反映
// Stripeダッシュボードで以下のイベントを登録すること:
//   customer.subscription.created
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.payment_failed
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;

  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    console.error('Webhook signature verification failed:', e.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const sb = getSupabase();

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      await sb
        .from('profiles')
        .update({
          subscription_id:         sub.id,
          subscription_status:     sub.status,          // active / past_due / canceled 等
          subscription_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_customer_id', sub.customer);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await sb
        .from('profiles')
        .update({
          subscription_status:        'canceled',
          subscription_period_end:    new Date(sub.current_period_end * 1000).toISOString(),
          subscription_cancelled_at:  new Date().toISOString(),
        })
        .eq('stripe_customer_id', sub.customer);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        await sb
          .from('profiles')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', invoice.customer);
      }
      break;
    }

    default:
      // 登録していない他のイベントは無視
      break;
  }

  return Response.json({ received: true });
}
