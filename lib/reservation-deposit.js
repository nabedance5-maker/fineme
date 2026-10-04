// 予約デポジットのStripe Checkoutセッション発行（決済機能Phase6③・でお要望2026-09-27）。
// POS online-checkout（lib/pos-checkout.js）と同じくStripe Connect destination charge方式。
// 対象は即時予約（その場で確定する枠）のみ。予約作成トランザクションの外側で呼ぶため、
// ここでの失敗は予約自体を失敗させない（呼び出し側でtry/catchして良い）。
import Stripe from 'stripe';
import { applicationFeeAmount } from '@/lib/payment-fee';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

export async function createDepositCheckout(supabase, { provider, reservation }) {
  const stripe = getStripe();
  if (!stripe) return null;
  if (!provider.stripe_connect_id || provider.stripe_connect_status !== 'active') return null;
  if (!provider.deposit_amount || provider.deposit_amount <= 0) return null;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: { currency: 'jpy', product_data: { name: '予約デポジット' }, unit_amount: provider.deposit_amount },
      quantity: 1,
    }],
    payment_intent_data: {
      transfer_data: { destination: provider.stripe_connect_id },
      application_fee_amount: applicationFeeAmount(provider.deposit_amount),
      metadata: { fineme_deposit_reservation_id: reservation.id },
    },
    metadata: { fineme_deposit_reservation_id: reservation.id },
    success_url: `${BASE_URL}/deposit-pay/${reservation.id}?paid=1`,
    cancel_url: `${BASE_URL}/deposit-pay/${reservation.id}?paid=0`,
  });

  await supabase.from('reservations').update({
    deposit_amount: provider.deposit_amount,
    deposit_status: 'pending',
    stripe_deposit_session_id: session.id,
  }).eq('id', reservation.id);

  return session.url;
}

// キャンセル・お断り時のデポジット返金。reverse_transfer:trueで店舗Connectアカウントから
// 引き戻す（destination charge方式のため、単なるrefundだけでは店舗側残高が引かれない）。
export async function refundDepositIfPaid(supabase, reservation) {
  if (reservation.deposit_status !== 'paid' || !reservation.stripe_deposit_payment_intent_id) return;
  const stripe = getStripe();
  if (!stripe) return;
  try {
    await stripe.refunds.create({ payment_intent: reservation.stripe_deposit_payment_intent_id, reverse_transfer: true });
    await supabase.from('reservations').update({ deposit_status: 'refunded' }).eq('id', reservation.id);
  } catch (e) {
    console.error('[refundDepositIfPaid]', e);
  }
}
