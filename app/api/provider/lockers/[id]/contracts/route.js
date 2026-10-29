// POST /api/provider/lockers/[id]/contracts → 契約開始（既に契約中なら拒否）
// でお要望2026-09-26：「ロッカー管理タブで手動割当した場合も自動課金できるように」。
// 契約者が既にオンライン入会（入会手続き）で有効な月会費サブスクを持つ会員なら、
// そのサブスクにロッカー代を追加項目として差し込んで即時自動課金する（カードは
// 既に登録済みのため本人操作は不要）。それ以外（非会員・オンライン入会未経由で
// カード未登録）は支払いページ（/pay/locker/[契約ID]）を発行し、Fineme会員と紐づいていれば
// LINE・マイページに自動で届ける（2026-10-29。それまでは店舗が手で送っていた）。月額未設定のロッカーは
// 従来通り記録のみ（課金対象にしない）。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { ensureLockerProduct, lockerPayUrl, notifyLockerPayment } from '@/lib/locker-pay';
import { planLockedResponse } from '@/lib/plan-features';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug, stripe_connect_id, stripe_connect_status, plan').eq('email', user.email).single();
  return data || null;
}

async function __POST(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'locker_rental'); if (locked) return locked; }

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
        const productId = await ensureLockerProduct(supabase, stripe, locker);
        const item = await stripe.subscriptionItems.create({
          subscription: activeMembership.stripe_subscription_id,
          price_data: { currency: 'jpy', product: productId, unit_amount: fee, recurring: { interval: 'month' } },
        });
        insertPayload.stripe_subscription_item_id = item.id;
        billingMode = 'auto';
      } else if (provider.stripe_connect_id && provider.stripe_connect_status === 'active') {
        // カード未登録 → Finemeの支払いページ（/pay/locker/[契約ID]）を発行し、会員ならLINE・マイページに届ける（2026-10-29）
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
  let notified = false;
  if (billingMode === 'link') {
    const url = lockerPayUrl(data.id);
    await supabase.from('provider_locker_contracts').update({ payment_link_url: url }).eq('id', data.id);
    data.payment_link_url = url;
    const { data: prov } = await supabase.from('providers').select('name').eq('id', provider.id).single();
    notified = await notifyLockerPayment(supabase, { contract: data, lockerName: locker.name, providerName: prov?.name || '' });
  }
  return Response.json({ ...data, billing_mode: billingMode, billing_error: billingError, notified }, { status: 201 });
}

export const POST = withAudit(__POST);
