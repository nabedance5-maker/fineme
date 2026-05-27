// POST /api/subscription/checkout
// Stripe Subscription のチェックアウトセッションを作成して URL を返す
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

export async function POST(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await getSupabase().auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  if (!priceId) return Response.json({ error: 'Subscription price not configured' }, { status: 500 });

  // 既存の stripe_customer_id を取得（あれば再利用）
  const { data: profile } = await getSupabase()
    .from('profiles')
    .select('stripe_customer_id, subscription_status')
    .eq('id', user.id)
    .single();

  // すでにアクティブなサブスクがあれば弾く
  if (profile?.subscription_status === 'active') {
    return Response.json({ error: 'already_subscribed' }, { status: 409 });
  }

  let customerId = profile?.stripe_customer_id || null;

  // customer がなければ作成
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await getSupabase()
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  const origin = request.headers.get('origin') || 'https://www.fineme.me';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/mypage/subscription?subscribed=1`,
    cancel_url:  `${origin}/mypage/subscription`,
    locale: 'ja',
    metadata: { supabase_user_id: user.id },
  });

  return Response.json({ url: session.url });
}
