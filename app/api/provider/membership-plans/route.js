// GET  /api/provider/membership-plans → 自店舗の会員プラン一覧
// POST /api/provider/membership-plans → 新規プラン作成（Stripe Product/Priceも同時作成）
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, name').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('provider_membership_plans')
    .select('*')
    .eq('provider_id', provider.id)
    .order('sort_order')
    .order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, monthly_price, description } = await request.json().catch(() => ({}));
  const price = parseInt(monthly_price, 10);
  if (!name?.trim() || !Number.isInteger(price) || price <= 0) {
    return Response.json({ error: 'プラン名と月額（1円以上の整数）は必須です' }, { status: 400 });
  }

  // Stripe側にProduct/Priceを作成（月額サブスク用）。price_idは店舗承認時の
  // サブスクリプション作成で使う。
  let stripeProductId = null;
  let stripePriceId = null;
  try {
    const product = await stripe.products.create({
      name: `${provider.name} - ${name.trim()}`,
      metadata: { fineme_provider_id: String(provider.id) },
    });
    const priceObj = await stripe.prices.create({
      product: product.id,
      unit_amount: price,
      currency: 'jpy',
      recurring: { interval: 'month' },
    });
    stripeProductId = product.id;
    stripePriceId = priceObj.id;
  } catch (e) {
    console.error('[membership-plans create stripe]', e);
    return Response.json({ error: 'Stripe側のプラン作成に失敗しました: ' + e.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('provider_membership_plans')
    .insert({
      provider_id: provider.id,
      name: name.trim(),
      monthly_price: price,
      description: description?.trim() || null,
      stripe_product_id: stripeProductId,
      stripe_price_id: stripePriceId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
