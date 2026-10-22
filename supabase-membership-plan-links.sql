-- ✅ 本番適用済 2026-10-22
-- 会員プランを軸に、オプション・割引・回数券・予約できるメニューをプランごとに紐づける（でお要望 2026-10-22：
-- 「回数券とかオプションとかの情報が全く紐づかない設定画面になってる。しかもプランごとにそれらの編集ができない」）。
-- hacomono のプラン（基本設定・予約制限・契約制限・チケット自動付与）を参考に、個人〜小規模店に要るものだけ。

ALTER TABLE provider_membership_plans
  ADD COLUMN IF NOT EXISTS initial_fee INTEGER NOT NULL DEFAULT 0,              -- 入会金（初回だけ）
  ADD COLUMN IF NOT EXISTS initial_fee_product_id TEXT,                         -- 入会金のStripe Product
  ADD COLUMN IF NOT EXISTS online_enabled BOOLEAN NOT NULL DEFAULT TRUE,        -- 入会ページからお客様が申し込めるか
  ADD COLUMN IF NOT EXISTS monthly_booking_limit INTEGER,                       -- このプランで予約できる回数（月）。NULLは無制限
  ADD COLUMN IF NOT EXISTS included_option_ids UUID[] NOT NULL DEFAULT '{}',    -- 必ず付くオプション（月会費に足して請求）
  ADD COLUMN IF NOT EXISTS selectable_option_ids UUID[],                        -- お客様が選べるオプション。NULLは全部
  ADD COLUMN IF NOT EXISTS discount_ids UUID[],                                 -- 使える割引・クーポン。NULLは全部
  ADD COLUMN IF NOT EXISTS ticket_grants JSONB NOT NULL DEFAULT '[]'::jsonb;    -- [{package_id, sessions, timing:'join'|'monthly', valid_days}]

-- 会員として予約した予約（月の回数上限の数え方に使う）
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS membership_plan_id UUID;

-- 毎月付与した回数券の記録（同じ月に二重に配らない）
CREATE TABLE IF NOT EXISTS provider_membership_ticket_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  membership_id UUID NOT NULL REFERENCES provider_memberships(id) ON DELETE CASCADE,
  package_id UUID NOT NULL,
  period TEXT NOT NULL,              -- 'join' または 'YYYY-MM'
  customer_package_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (membership_id, package_id, period)
);
ALTER TABLE provider_membership_ticket_grants ENABLE ROW LEVEL SECURITY;
