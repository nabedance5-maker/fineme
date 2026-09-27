-- ✅ 本番適用済 2026-09-27
-- でお要望2026-09-27：決済機能（Phase 6）の第一弾として、回数券・パッケージの
-- オンライン購入をStripeで実装する。入会手続き(membership_enrollment)で実証済みの
-- Stripe Connect destination charge方式をそのまま流用する。
-- Checkout Session(mode:'payment')のidを持たせ、確定処理(confirm)の二重実行防止に使う。
ALTER TABLE customer_packages ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS customer_packages_checkout_session_idx ON customer_packages(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;
