// POST /api/stripe/update-subscription
// 掲載者が現在のプランを変更する（A→B、A→C、B→C等）
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { PLANS } from '@/lib/stripe-plans';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripe は未設定です' }, { status: 503 });

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return Response.json({ error: '認証が必要です' }, { status: 401 });

  const supabase = getSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return Response.json({ error: '認証エラー' }, { status: 401 });

  const { newPlan } = await request.json();
  if (!PLANS[newPlan]) return Response.json({ error: '無効なプランです' }, { status: 400 });

  // 掲載者情報を取得
  const { data: provider, error: provErr } = await supabase
    .from('providers')
    .select('id, plan, stripe_subscription_id, billing_status')
    .eq('user_id', user.id)
    .single();

  if (provErr || !provider) return Response.json({ error: '掲載者情報が見つかりません' }, { status: 404 });
  if (!provider.stripe_subscription_id) return Response.json({ error: 'Stripe連携がありません' }, { status: 400 });
  if (provider.plan === newPlan) return Response.json({ error: '現在と同じプランです' }, { status: 400 });

  try {
    // 現在のSubscriptionを取得してitem IDを確認
    const subscription = await stripe.subscriptions.retrieve(provider.stripe_subscription_id);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) return Response.json({ error: 'サブスクリプションアイテムが見つかりません' }, { status: 400 });

    // プランを即時変更（proration_behavior: 'create_prorations' で日割り計算）
    const updated = await stripe.subscriptions.update(provider.stripe_subscription_id, {
      items: [{ id: itemId, price: PLANS[newPlan].price_id }],
      proration_behavior: 'create_prorations',
    });

    // Supabaseのプランを更新
    await supabase
      .from('providers')
      .update({ plan: newPlan })
      .eq('id', provider.id);

    return Response.json({
      success: true,
      plan: newPlan,
      amount: PLANS[newPlan].amount,
      commission_rate: PLANS[newPlan].commission_rate,
      status: updated.status,
    });
  } catch (err) {
    console.error('[update-subscription]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
