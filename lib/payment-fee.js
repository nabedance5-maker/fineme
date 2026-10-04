// Fineme決済手数料。Stripe手数料込みの総額で、全プラン共通・店舗負担。
// 決済代金から差し引いて店舗へ送金する（Stripe Connectのapplication fee）。
export const PAYMENT_FEE_RATE = 0.045;
export const PAYMENT_FEE_PERCENT = PAYMENT_FEE_RATE * 100;

// 1回払い（Checkoutのpayment_intent_data）に差し込むための手数料額（円）。
export function applicationFeeAmount(amount) {
  const fee = Math.round(Number(amount) * PAYMENT_FEE_RATE);
  return fee > 0 ? fee : undefined;
}
