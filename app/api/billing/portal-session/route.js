// POST /api/billing/portal-session - Stripe Customer Portalセッション生成
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) {
    return Response.json({ error: 'Stripe は未設定です' }, { status: 503 });
  }

  // Supabase Bearer token 認証
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  // メールで掲載者を特定
  const { data: provider, error: provError } = await supabase
    .from('providers')
    .select('id, name, email, plan, stripe_customer_id')
    .eq('email', user.email)
    .single();

  if (provError || !provider) {
    return Response.json({ error: 'Provider not found' }, { status: 404 });
  }

  // 特例プラン（free）はStripe管理対象外
  if (provider.plan === 'free') {
    return Response.json(
      { error: '特例プランのため、カード情報の管理は不要です。プラン変更については運営にお問い合わせください。' },
      { status: 403 }
    );
  }

  let customerId = provider.stripe_customer_id;

  // stripe_customer_id がない場合は動的に作成してDBに保存
  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: provider.email,
        name: provider.name || undefined,
        metadata: { provider_id: provider.id },
      });
      customerId = customer.id;
      await supabase
        .from('providers')
        .update({ stripe_customer_id: customerId })
        .eq('id', provider.id);
    } catch (err) {
      console.error('[portal-session] customer create error:', err);
      return Response.json({ error: 'Stripe顧客の作成に失敗しました: ' + err.message }, { status: 500 });
    }
  }

  try {
    const origin = request.headers.get('origin') || 'https://fineme.me';
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/provider/billing`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[portal-session] error:', err);
    // Customer Portal が未設定の場合に特定のエラーを出す
    if (err.message?.includes('No configuration')) {
      return Response.json(
        { error: 'Stripeのカスタマーポータルが未設定です。管理者にお問い合わせください。' },
        { status: 503 }
      );
    }
    return Response.json({ error: err.message }, { status: 500 });
  }
}
