import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/stripe/webhook
 * Stripeからのイベントを受信してDBを更新する
 *
 * 処理するイベント:
 * - customer.subscription.updated  → subscriptions テーブル更新
 * - customer.subscription.deleted  → status = cancelled
 * - invoice.payment_succeeded      → payments テーブルに記録
 * - invoice.payment_failed         → providers の subscriptionStatus を past_due に
 */
export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return new Response('Stripe is not configured', { status: 503 });

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object;
        await upsertSubscription(sub);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await upsertSubscription({ ...sub, status: 'cancelled' });
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await recordPayment(invoice, 'paid');
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await recordPayment(invoice, 'failed');
        break;
      }
      default:
        // ignore
    }
  } catch (err) {
    console.error(`[webhook] handler error for ${event.type}:`, err);
    // 200を返してStripeのリトライを止める（ログ済み）
  }

  return new Response('ok', { status: 200 });
}

async function upsertSubscription(sub) {
  // DBアクセスはサーバーサイド（Next.js API Route）からは直接SQLiteを叩かず、
  // Express server のエンドポイント経由 or server-actions で処理する設計。
  // ここでは console.log + TODO コメントで実装の骨格を示す。
  // TODO: server/db.js の open() を使って subscriptions テーブルを更新する
  const providerId = sub.metadata?.fineme_provider_id;
  console.log(`[webhook] subscription ${sub.status} for provider ${providerId}: ${sub.id}`);

  // 内部APIを叩いてDB更新（Express serverが立ち上がっている場合）
  const serverUrl = process.env.INTERNAL_SERVER_URL || 'http://localhost:3001';
  await fetch(`${serverUrl}/internal/subscriptions/upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
    body: JSON.stringify({
      providerId,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: sub.customer,
      status: sub.status,
      currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      amount: sub.items?.data?.[0]?.price?.unit_amount || 0,
    }),
  }).catch(e => console.warn('[webhook] internal upsert failed:', e.message));
}

async function recordPayment(invoice, status) {
  const providerId = invoice.subscription_details?.metadata?.fineme_provider_id
    || invoice.metadata?.fineme_provider_id;
  console.log(`[webhook] payment ${status} for provider ${providerId}: ${invoice.id}`);

  const serverUrl = process.env.INTERNAL_SERVER_URL || 'http://localhost:3001';
  await fetch(`${serverUrl}/internal/payments/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY || '' },
    body: JSON.stringify({
      providerId,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: invoice.payment_intent,
      amount: invoice.amount_paid || invoice.amount_due,
      currency: invoice.currency,
      status,
      paidAt: status === 'paid' ? new Date().toISOString() : null,
    }),
  }).catch(e => console.warn('[webhook] internal payment record failed:', e.message));
}
