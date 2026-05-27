-- ✅ 本番適用済 （適用後にこの行を更新）
-- サブスクリプション管理カラム

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id        TEXT,
  ADD COLUMN IF NOT EXISTS subscription_id           TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status       TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_period_end   TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mirror_monthly_free_used_at TIMESTAMPTZ DEFAULT NULL;

-- インデックス（ stripeのcustomer_idで検索するwebhook用）
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON profiles (stripe_customer_id);
