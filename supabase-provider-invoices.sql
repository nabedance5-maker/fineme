-- ✅ 本番適用済 2026-10-04
-- 請求（掲載者がお客様へFineme経由でお支払いをお願いする）。
-- 店舗が金額・内容を決めて請求を作ると支払いリンクが発行され、お客様はカードで支払う
-- （Stripe Connect。代金は店舗のStripeアカウントへ）。非会員（来店客）にもリンクで請求できる。
-- 現金などで受け取った場合は店舗が「入金済みにする」で記録する。
-- アクセスはサービスロール経由のAPIのみ（RLS有効・ポリシーなし）。
CREATE TABLE IF NOT EXISTS provider_invoices (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id                 UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id                     UUID,
  manual_customer_id          UUID,
  customer_name               TEXT,
  title                       TEXT NOT NULL,
  amount                      INTEGER NOT NULL CHECK (amount > 0),
  note                        TEXT,
  due_date                    DATE,
  status                      TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'canceled')),
  paid_method                 TEXT CHECK (paid_method IN ('online', 'offline')),
  paid_at                     TIMESTAMPTZ,
  stripe_checkout_session_id  TEXT,
  stripe_payment_intent_id    TEXT,
  sales_entry_id              UUID,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_invoices_provider_idx ON provider_invoices(provider_id, created_at DESC);
ALTER TABLE provider_invoices ENABLE ROW LEVEL SECURITY;
