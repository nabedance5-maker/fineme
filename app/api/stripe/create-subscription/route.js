// POST /api/stripe/create-subscription
// 掲載者登録時に Stripe Customer のみ作成（Subscription は作らない）
// 課金は掲載者が自らアップグレードを選んだときに開始する（freemium モデル）
import { getSupabase } from '@/lib/supabase';
import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const supabaseAdmin = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripe は未設定です' }, { status: 503 });

  try {
    const { providerId, email, displayName, referralCode } = await request.json();

    if (!providerId || !email) {
      return Response.json({ error: 'providerId と email は必須です' }, { status: 400 });
    }

    // Stripe Customer 作成（Subscription は後からアップグレード時に作成）
    const customer = await stripe.customers.create({
      email,
      name: displayName || email,
      metadata: {
        fineme_provider_id: String(providerId),
        referral_code: referralCode || '',
      },
    });

    // Supabase providers テーブルに保存（billing_status = 'free'）
    await supabaseAdmin.from('providers').upsert({
      id: String(providerId),
      email,
      name: displayName || email,
      stripe_customer_id: customer.id,
      billing_status: 'free',
    }, { onConflict: 'id' });

    return Response.json({
      customerId: customer.id,
      status: 'free',
    });
  } catch (err) {
    console.error('[create-subscription]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
