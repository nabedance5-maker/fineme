-- ✅ 本番適用済 2026-10-19
-- 月会費（会員プラン）の支払い記録（でお要望 2026-10-19：hacomonoの「月会費支払状況」相当）。
-- Stripeの請求ごとに1行。支払い失敗の一覧・再請求・カードの更新案内に使う。
CREATE TABLE IF NOT EXISTS provider_membership_payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id        UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  membership_id      UUID NOT NULL REFERENCES provider_memberships(id) ON DELETE CASCADE,
  stripe_invoice_id  TEXT NOT NULL UNIQUE,
  amount             INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL CHECK (status IN ('paid', 'failed', 'open', 'void')),
  period_start       DATE,
  failure_message    TEXT,
  attempt_count      INTEGER NOT NULL DEFAULT 0,
  next_attempt_at    TIMESTAMPTZ,
  paid_at            TIMESTAMPTZ,
  sales_entry_id     UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_membership_payments_provider_idx ON provider_membership_payments (provider_id, status);

ALTER TABLE provider_memberships ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'ok' CHECK (payment_status IN ('ok', 'past_due', 'unpaid'));
ALTER TABLE provider_memberships ADD COLUMN IF NOT EXISTS last_paid_at TIMESTAMPTZ;
ALTER TABLE provider_memberships ADD COLUMN IF NOT EXISTS last_failed_at TIMESTAMPTZ;

ALTER TABLE provider_membership_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON provider_membership_payments FROM anon, authenticated;
