// POST /api/stripe/provider-subscribe
// 無料掲載中の掲載者がプランを選択して New Me Map 掲載を開始するための
// Stripe Checkout セッションを作成して返す
import { getSupabase } from '@/lib/supabase';
import Stripe from 'stripe';
import { PLANS } from '@/lib/stripe-plans';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripe は未設定です' }, { status: 503 });

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = getSupabase();
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan = 'A' } = await request.json();
    const planConfig = PLANS[plan];
    if (!planConfig) return Response.json({ error: '無効なプランです' }, { status: 400 });

    // 掲載者情報を取得
    const { data: provider } = await db
      .from('providers')
      .select('id, stripe_customer_id, billing_status, referral_code')
      .eq('email', user.email)
      .single();

    if (!provider) return Response.json({ error: '掲載者情報が見つかりません' }, { status: 404 });
    if (provider.billing_status === 'active') {
      return Response.json({ error: 'すでに有料プランです。プラン変更は「支払い方法」からどうぞ。' }, { status: 409 });
    }

    let customerId = provider.stripe_customer_id;

    // Stripe Customer が未作成の場合は作成（旧登録フロー経由の掲載者対応）
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { fineme_provider_id: String(provider.id) },
      });
      customerId = customer.id;
      await db.from('providers').update({ stripe_customer_id: customerId }).eq('id', provider.id);
    }

    // Stripe Checkout セッション作成（subscription モード・即時課金）
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: planConfig.price_id, quantity: 1 }],
      subscription_data: {
        metadata: { fineme_provider_id: String(provider.id) },
      },
      success_url: `${BASE_URL}/provider/billing?subscribed=1`,
      cancel_url:  `${BASE_URL}/provider/billing?canceled=1`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[provider-subscribe]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
