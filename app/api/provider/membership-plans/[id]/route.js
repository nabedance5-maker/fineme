// PATCH  /api/provider/membership-plans/[id] → プラン編集（active切替・名称・説明・価格変更）
// DELETE /api/provider/membership-plans/[id] → プラン削除（利用中の申込が無ければ）
// Stripeの価格(Price)は変更不可のオブジェクトのため、月額を変える場合は新しいPriceを
// 作成して差し替える（既存のStripe請求の仕組みと同じ標準パターン）。
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
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: plan } = await supabase.from('provider_membership_plans').select('*').eq('id', id).eq('provider_id', provider.id).single();
  if (!plan) return Response.json({ error: 'プランが見つかりません' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const update = {};
  if ('name' in body) update.name = body.name?.trim();
  if ('description' in body) update.description = body.description?.trim() || null;
  if ('active' in body) update.active = !!body.active;

  if ('monthly_price' in body) {
    const price = parseInt(body.monthly_price, 10);
    if (!Number.isInteger(price) || price <= 0) return Response.json({ error: '月額は1円以上の整数で指定してください' }, { status: 400 });
    if (price !== plan.monthly_price) {
      const stripe = getStripe();
      if (!stripe) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });
      try {
        const priceObj = await stripe.prices.create({
          product: plan.stripe_product_id,
          unit_amount: price,
          currency: 'jpy',
          recurring: { interval: 'month' },
        });
        update.monthly_price = price;
        update.stripe_price_id = priceObj.id;
      } catch (e) {
        return Response.json({ error: 'Stripe側の価格更新に失敗しました: ' + e.message }, { status: 500 });
      }
    }
  }

  const { data, error } = await supabase.from('provider_membership_plans').update(update).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { count } = await supabase.from('provider_memberships').select('id', { count: 'exact', head: true }).eq('plan_id', id).in('status', ['pending_approval', 'active']);
  if ((count || 0) > 0) return Response.json({ error: 'このプランを利用中の申込があるため削除できません。非表示（停止）にしてください' }, { status: 409 });

  const { error } = await supabase.from('provider_membership_plans').delete().eq('id', id).eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
