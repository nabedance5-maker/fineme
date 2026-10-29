// 「お客様のスマホで払う（QR）」のStripe決済ページを作る（お店のレジ・お客様の確認ページの両方から使う）。
// saveCard のときは、お客様が「次回からこのカードで払えるようにする」を選んだので、あとでお店のレジから請求できる形で保存する
// （setup_future_usage: off_session。保存先は支払い確定時に webhook が provider_customer_cards に記録する。2026-10-29）。
import { applicationFeeAmount } from '@/lib/payment-fee';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

export async function createPosCheckoutSession(stripe, provider, pending, { lineName, customerId = null, saveCard = false } = {}) {
  const meta = { fineme_provider_id: provider.id, fineme_pos_pending_id: pending.id, ...(saveCard ? { fineme_save_card: '1' } : {}) };
  return stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price_data: { currency: 'jpy', product_data: { name: lineName || 'お会計' }, unit_amount: pending.total_amount }, quantity: 1 }],
    ...(customerId ? { customer: customerId } : {}),
    payment_intent_data: {
      transfer_data: { destination: provider.stripe_connect_id },
      application_fee_amount: applicationFeeAmount(pending.total_amount),
      metadata: meta,
      ...(saveCard ? { setup_future_usage: 'off_session' } : {}),
    },
    ...(saveCard ? { custom_text: { submit: { message: `このカードは、次回から${provider.name}でのお会計に使えるよう保存されます（お店が会員証を読み取った時だけ使います）。Finemeのマイページからいつでも外せます。` } } } : {}),
    metadata: meta,
    success_url: `${BASE_URL}/pos-pay/${pending.id}?paid=1`,
    cancel_url: `${BASE_URL}/pos-pay/${pending.id}?paid=0`,
  });
}

export function posLineName(priced) {
  return priced.lineItems.length === 1 ? priced.lineItems[0].name_snapshot : `お会計（${priced.lineItems.length}点${priced.cartOff ? '・割引あり' : ''}）`;
}
