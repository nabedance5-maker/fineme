-- ✅ 本番適用済 2026-09-04
-- 店舗が抱えるFineme非会員のお客様のカルテ管理（でお要望 2026-09-01）。
-- 店舗のお客様には、Finemeに登録していない方も含まれる。そうしたお客様も
-- 会員と同じようにカルテを記録できるようにする。
--
-- 非会員として作った記録は、後からそのお客様がFinemeに登録して来店を
-- 続けた場合でも消さず・書き換えず、そのまま「非会員時代の記録」として
-- 残す。会員と判明したら linked_user_id をセットして紐付けるだけにし、
-- 表示側(app/api/provider/customers/[user_id]/karte-entries/route.js)で
-- 会員側の記録と非会員時代の記録を合算して1人分の履歴として見せる。
CREATE TABLE IF NOT EXISTS provider_manual_customers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  display_name   TEXT NOT NULL,
  memo           TEXT,
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE provider_manual_customers ENABLE ROW LEVEL SECURITY;
-- 他のお客様のカルテと同様、公開読み取りは許可しない。書き込み・読み取りとも
-- service_role（APIルート、店舗本人の認証必須）のみ。

-- provider_karte_entries を非会員でも使えるよう拡張。
-- 従来 user_id は必須(auth.usersへの実会員FK)だったため非会員の記録を作れなかった。
ALTER TABLE provider_karte_entries ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE provider_karte_entries ADD COLUMN IF NOT EXISTS manual_customer_id UUID REFERENCES provider_manual_customers(id) ON DELETE CASCADE;
ALTER TABLE provider_karte_entries DROP CONSTRAINT IF EXISTS provider_karte_entries_one_customer_check;
ALTER TABLE provider_karte_entries ADD CONSTRAINT provider_karte_entries_one_customer_check
  CHECK (
    (user_id IS NOT NULL AND manual_customer_id IS NULL) OR
    (user_id IS NULL AND manual_customer_id IS NOT NULL)
  );
