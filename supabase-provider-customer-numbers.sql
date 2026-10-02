-- ✅ 本番適用済 2026-10-02
-- 店舗ごとの顧客会員番号（でお要望2026-10-02：顧客に会員番号を振って一覧に出し、
-- その番号でも検索できるように）。番号は店舗内の連番（店舗ごとに1から）。
-- 会員（user_id）・非会員（manual_customer_id）どちらにも振る。非会員を会員に
-- 紐付けた時は、その番号を会員に引き継ぐ（店頭で案内済みの番号が変わらないように）。
CREATE TABLE IF NOT EXISTS provider_customer_numbers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id        UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  manual_customer_id UUID REFERENCES provider_manual_customers(id) ON DELETE CASCADE,
  member_number      INT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT provider_customer_numbers_one_customer CHECK ((user_id IS NOT NULL) <> (manual_customer_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS provider_customer_numbers_number_uq ON provider_customer_numbers (provider_id, member_number);
CREATE UNIQUE INDEX IF NOT EXISTS provider_customer_numbers_user_uq ON provider_customer_numbers (provider_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS provider_customer_numbers_manual_uq ON provider_customer_numbers (provider_id, manual_customer_id) WHERE manual_customer_id IS NOT NULL;
ALTER TABLE provider_customer_numbers ENABLE ROW LEVEL SECURITY;
-- 公開読み取りは許可しない。service_role（APIルート）のみ。
