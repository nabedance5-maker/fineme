-- ✅ 本番適用済 2026-09-27
-- でお要望2026-09-27：決済機能（Phase 6）②POSのオンライン決済。
-- POSは会員登録の無い来店客（walk-in）も対象になるため、入会手続き・回数券購入と
-- 違いログイン前提のconfirm(お客様がsuccess_urlに戻ってきた時に確定)方式が使えない。
-- 代わりにStripeのWebhook（checkout.session.completed）駆動で確定する。
-- 決済確定まではprovider_pos_transactions等には一切書き込まず、支払いが取れて
-- 初めて記録する（未払いの会計が記録に残らないように）。
CREATE TABLE IF NOT EXISTS provider_pos_pending_checkouts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id              UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  items                    JSONB NOT NULL,       -- [{product_id, qty}, ...]（checkoutと同じ形式）
  staff_id                 UUID REFERENCES provider_staff(id) ON DELETE SET NULL,
  memo                     TEXT,
  total_amount             INTEGER NOT NULL,
  stripe_checkout_session_id TEXT,
  status                   TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  transaction_id            UUID REFERENCES provider_pos_transactions(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pos_pending_checkouts_session ON provider_pos_pending_checkouts(stripe_checkout_session_id);
ALTER TABLE provider_pos_pending_checkouts ENABLE ROW LEVEL SECURITY;
-- 他の店舗運営系テーブルと同様、公開readポリシーは作らずservice_role(APIルート)のみに絞る。
