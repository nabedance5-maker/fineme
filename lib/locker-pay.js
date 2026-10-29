// ロッカー代の支払いリンク（カードがまだ登録されていないお客様。2026-10-29）。
// リンクは Fineme のページ（/pay/locker/[契約ID]）にして、開くたびに Stripe の決済ページを作り直す
// （Stripe の決済ページそのものは24時間で使えなくなるため）。払われたら webhook が契約に月額（サブスク）を記録する。
import { PAYMENT_FEE_PERCENT } from '@/lib/payment-fee';
import { notifyCustomerLine } from '@/lib/reservation-notify';

export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';
export const lockerPayUrl = id => `${BASE_URL}/pay/locker/${id}`;

// まだ払われていない（引き落としが始まっていない）支払いリンク付きの契約か
export const awaitingPayment = c => c && c.status === 'active' && !!c.payment_link_url && !c.stripe_subscription_id && !c.stripe_subscription_item_id;

export async function ensureLockerProduct(db, stripe, locker) {
  if (locker.stripe_product_id) return locker.stripe_product_id;
  const product = await stripe.products.create({ name: `ロッカー：${locker.name}` });
  await db.from('provider_lockers').update({ stripe_product_id: product.id }).eq('id', locker.id);
  return product.id;
}

export async function createLockerCheckout(db, stripe, { contract, locker, provider, customerId = null }) {
  const productId = await ensureLockerProduct(db, stripe, locker);
  // 契約と結びつける目印。fineme_provider_id は付けない（お店自身の掲載プランの契約と取り違えないように）
  const meta = { fineme_locker_contract_id: contract.id, fineme_locker_provider_id: provider.id };
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price_data: { currency: 'jpy', product: productId, unit_amount: contract.monthly_fee, recurring: { interval: 'month' } }, quantity: 1 }],
    ...(customerId ? { customer: customerId } : {}),
    subscription_data: { transfer_data: { destination: provider.stripe_connect_id }, application_fee_percent: PAYMENT_FEE_PERCENT, metadata: meta },
    metadata: meta,
    success_url: `${lockerPayUrl(contract.id)}?paid=1`,
    cancel_url: lockerPayUrl(contract.id),
  });
}

export async function notifyLockerPayment(db, { contract, lockerName, providerName }) {
  if (!contract.user_id) return false;
  await notifyCustomerLine(db, {
    userId: contract.user_id, providerId: contract.provider_id,
    message: `${providerName}より、ロッカーのお支払いのご案内です。\n\nロッカー：${lockerName}\n月額：¥${Number(contract.monthly_fee).toLocaleString()}\n\n下のリンクからカードを登録すると、毎月自動でお支払いになります。\n${lockerPayUrl(contract.id)}`,
  });
  await db.from('provider_locker_contracts').update({ payment_notified_at: new Date().toISOString() }).eq('id', contract.id);
  return true;
}

// お客様が支払いリンクで払い終わった（webhook）：契約に月額を記録する。もう解約されていたら月額をすぐ止める
export async function recordLockerCheckout(db, stripe, session) {
  const contractId = session.metadata?.fineme_locker_contract_id;
  if (!contractId) return false;
  const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
  const custId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const { data: c } = await db.from('provider_locker_contracts').select('id, status, stripe_subscription_id').eq('id', contractId).maybeSingle();
  if (!c || !subId) return true;
  if (c.status !== 'active' || (c.stripe_subscription_id && c.stripe_subscription_id !== subId)) {
    try { await stripe.subscriptions.cancel(subId); } catch (e) { console.error('[locker checkout] cancel extra subscription', e?.message); }
    return true;
  }
  await db.from('provider_locker_contracts').update({ stripe_subscription_id: subId, stripe_customer_id: custId || null, billing_started_at: new Date().toISOString(), stripe_checkout_session_id: null }).eq('id', contractId);
  return true;
}

// ロッカー代が引き落とされた（webhook）：売上管理に1行記録する
export async function recordLockerInvoice(db, invoice) {
  const meta = invoice.subscription_details?.metadata || invoice.parent?.subscription_details?.metadata || {};
  const contractId = meta.fineme_locker_contract_id;
  if (!contractId) return false;
  const { data: c } = await db.from('provider_locker_contracts').select('provider_id, locker_id, contractor_name').eq('id', contractId).maybeSingle();
  if (!c || !(invoice.amount_paid > 0)) return true;
  const memo = `ロッカー代：${c.contractor_name}（${invoice.id}）`;
  // 同じ請求の通知が2回届いても、売上は1回だけ
  const { data: dup } = await db.from('provider_sales_entries').select('id').eq('provider_id', c.provider_id).eq('memo', memo).limit(1);
  if (dup?.length) return true;
  const { data: locker } = await db.from('provider_lockers').select('name').eq('id', c.locker_id).maybeSingle();
  await db.from('provider_sales_entries').insert({
    provider_id: c.provider_id,
    entry_date: new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10),
    amount: invoice.amount_paid,
    menu_name: `ロッカー：${locker?.name || ''}`,
    payment_method: 'オンライン決済',
    memo,
    source: 'manual',
  });
  return true;
}
