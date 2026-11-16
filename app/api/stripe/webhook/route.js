// POST /api/stripe/webhook
// Stripeイベントを受信してSupabaseを更新する
// billing_status: free → active（payment_succeeded）/ cancelled / past_due
// 処理の中身は lib/stripe-event-handler.js。取りこぼしは /api/cron/stripe-reconcile が1時間ごとに拾い直す（2026-11-16）。
// 処理に失敗した時は 500 を返し、Stripe に送り直してもらう（以前は失敗しても 200 を返していた）。
import { getSupabase } from '@/lib/supabase';
import Stripe from 'stripe';
import { handleStripeEvent, claimStripeEvent, releaseStripeEvent } from '@/lib/stripe-event-handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    return new Response('Webhook Error: invalid signature', { status: 400 });
  }

  let claimed = false;
  try {
    claimed = await claimStripeEvent(supabaseAdmin, event, 'webhook');
    if (!claimed) return new Response('ok (already processed)', { status: 200 });
    await handleStripeEvent(supabaseAdmin, stripe, event);
  } catch (err) {
    console.error(`[webhook] handler error for ${event.type} ${event.id}:`, err);
    if (claimed) { try { await releaseStripeEvent(supabaseAdmin, event.id); } catch {} }
    return new Response('handler error', { status: 500 });
  }

  return new Response('ok', { status: 200 });
}
