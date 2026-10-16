-- ✅ 本番適用済 2026-10-16
-- 顧客の基本情報（でお要望 2026-10-16：hacomonoのように住所・電話番号なども登録して見られるように）。
-- 店舗ごとに、Fineme会員（user_id）または非会員（manual_customer_id）1人につき1行。
-- オンライン入会の申込内容は、入会の承認時に空欄だけ自動で取り込む。カード番号は保存しない（Stripeが保持）。
CREATE TABLE IF NOT EXISTS provider_customer_profiles (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id        UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id            UUID,
  manual_customer_id UUID REFERENCES provider_manual_customers(id) ON DELETE CASCADE,
  last_name          TEXT,
  first_name         TEXT,
  last_name_kana     TEXT,
  first_name_kana    TEXT,
  email              TEXT,
  phone              TEXT,
  gender             TEXT CHECK (gender IN ('female', 'male', 'other')),
  birthday           DATE,
  postal_code        TEXT,
  prefecture         TEXT,
  city               TEXT,
  address1           TEXT,
  address2           TEXT,
  emergency_name     TEXT,
  emergency_relation TEXT,
  emergency_phone    TEXT,
  mail_opt_in        BOOLEAN NOT NULL DEFAULT false,
  updated_by         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((user_id IS NOT NULL) <> (manual_customer_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS provider_customer_profiles_user_uq ON provider_customer_profiles (provider_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS provider_customer_profiles_manual_uq ON provider_customer_profiles (provider_id, manual_customer_id) WHERE manual_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS provider_customer_profiles_phone_idx ON provider_customer_profiles (provider_id, phone);
ALTER TABLE provider_customer_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON provider_customer_profiles FROM anon, authenticated;
