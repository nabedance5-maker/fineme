-- ✅ 本番適用済 2026-10-28
-- POSのカード払い（でお要望 2026-10-28：会員証のQRを読み取って、登録済みのカードで物販のお会計をしたい）。
-- カードで払われた会計（登録済みのカード・お客様のスマホでのオンライン決済）に Stripe の支払いIDを残し、返品の時にStripe側も返金できるようにする。
ALTER TABLE provider_pos_transactions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
