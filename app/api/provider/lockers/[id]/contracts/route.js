// POST /api/provider/lockers/[id]/contracts → 契約開始（既に契約中なら拒否）
// でお要望2026-09-26：「ロッカー管理タブで手動割当した場合も自動課金できるように」。
// 契約者が既にオンライン入会（入会手続き）で有効な月会費サブスクを持つ会員なら、
// そのサブスクにロッカー代を追加項目として差し込んで即時自動課金する（カードは
// 既に登録済みのため本人操作は不要）。それ以外（非会員・オンライン入会未経由で
// カード未登録）はStripe Checkoutの支払いリンクを発行するところまでで、実際に
// 本人へ送って完了させるのは店舗側の運用に委ねる（でお判断2026-09-26：「やらない
// っていう人は店舗側でどうにかしてくれればいい」）。月額未設定のロッカーは
// 従来通り記録のみ（課金対象にしない）。
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
  const { data } = await supabase.from('providers').select('id, slug, stripe_connect_id, stripe_connect_status').eq('email', user.email).single();
  return data || null;
}

async function ensureLockerProduct(stripe, locker) {
  if (locker.stripe_product_id) return locker.stripe_product_id;
  const product = await stripe.products.create({ name: `ロッカー：${locker.name}` });
  await supabase.from('provider_lockers').update({ stripe_product_id: product.id }).eq('id', locker.id);
  return product.id;
}

export async function POST(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: locker } = await supabase.from('provider_lockers').select('*').eq('id', id).eq('provider_id', provider.id).single();
  if (!locker) return Response.json({ error: 'ロッカーが見つかりません' }, { status: 404 });

  const { count } = await supabase.from('provider_locker_contracts').select('id', { count: 'exact', head: true }).eq('locker_id', id).eq('status', 'active');
  if ((count || 0) > 0) return Response.json({ error: 'このロッカーは既に契約中です' }, { status: 409 });

  const body = await request.json().catch(() => ({}));
  const { contractor_name, monthly_fee, note, user_id } = body;
  if (!contractor_name?.trim()) return Response.json({ error: '契約者名は必須です' }, { status: 400 });

  const fee = Number.isFinite(Number(monthly_fee)) && monthly_fee !== '' ? Number(monthly_fee) : (locker.monthly_fee || null);

  const insertPayload = {
    locker_id: id,
    provider_id: provider.id,
    user_id: user_id || null,
    contractor_name: contractor_name.trim(),
    monthly_fee: fee,
    note: note || null,
  };

  // 課金を試みるのは金額が設定されている時だけ。失敗しても契約記録自体は作る
  // （店舗が後から手動で対応できるように、課金エラーで契約登録ごと失敗させない）。
  let billingMode = 'none';
  let billingError = null;
  const stripe = fee ? getStripe() : null;
  if (fee && stripe) {
    try {
      let activeMembership = null;
      if (user_id) {
        const { data } = await supabase
          .from('provider_memberships')
          .select('id, stripe_subscription_id')
          .eq('provider_id', provider.id)
          .eq('user_id', user_id)
          .eq('status', 'active')
          .not('stripe_subscription_id', 'is', null)
          .maybeSingle();
        activeMembership = data || null;
      }

      if (activeMembership) {
        // 既にカードが登録済みの会員 → 既存サブスクにロッカー代を追加項目として差し込む
        const productId = await ensureLockerProduct(stripe, locker);
        const item = await stripe.subscriptionItems.create({
          subscription: activeMembership.stripe_subscription_id,
          price_data: { currency: 'jpy', product: productId, unit_amount: fee, recurring: { interval: 'month' } },
        });
        insertPayload.stripe_subscription_item_id = item.id;
        billingMode = 'auto';
      } else if (provider.stripe_connect_id && provider.stripe_connect_status === 'active') {
        // カード未登録 → 支払いリンクを発行するところまで（送るのは店舗側の運用）
        const productId = await ensureLockerProduct(stripe, locker);
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          line_items: [{ price_data: { currency: 'jpy', product: productId, unit_amount: fee, recurring: { interval: 'month' } }, quantity: 1 }],
          subscription_data: { transfer_data: { destination: provider.stripe_connect_id } },
          success_url: `https://fineme.me/provider/${provider.slug || ''}?locker_payment=success`,
          cancel_url: `https://fineme.me/provider/${provider.slug || ''}?locker_payment=cancelled`,
        });
        insertPayload.payment_link_url = session.url;
        billingMode = 'link';
      }
    } catch (e) {
      console.error('[locker contract billing]', e);
      billingError = e.message;
    }
  }

  const { data, error } = await supabase
    .from('provider_locker_contracts')
    .insert(insertPayload)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ...data, billing_mode: billingMode, billing_error: billingError }, { status: 201 });
}
