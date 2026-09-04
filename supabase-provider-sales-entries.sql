-- ✅ 本番適用済 2026-09-04
-- 店舗の売上管理（でお要望 2026-09-04）。
--
-- Finemeは決済を仲介していないため、予約(reservations.price)や来店ログ
-- (user_service_logs.cost、顧客の自己申告)を無条件に「売上」として自動集計
-- するのは不正確（金額の実態と一致する保証がない）。そのため確定額は必ず
-- 店舗自身の確認を経て記録する方式にする：
--   ①予約が「来店済み」になった時、店舗が実際のメニュー・金額・スタッフ・
--     支払い方法を確認/修正して確定（reservation_id付きで記録）
--   ②非会員・Fineme経由でない売上は「＋手動で追加」から直接記録
--     （reservation_id無し）
-- どちらも最終的にこの1テーブルに集約され、店舗全体の売上として可視化できる。
CREATE TABLE IF NOT EXISTS provider_sales_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  entry_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  amount         INTEGER NOT NULL,
  menu_name      TEXT,
  staff_id       UUID REFERENCES provider_staff(id) ON DELETE SET NULL,
  payment_method TEXT,
  memo           TEXT,
  source         TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('reservation', 'manual')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS provider_sales_entries_provider_date_idx ON provider_sales_entries(provider_id, entry_date DESC);

ALTER TABLE provider_sales_entries ENABLE ROW LEVEL SECURITY;
-- 店舗の売上は機密情報。公開読み取りは許可しない。service_role（APIルート、店舗本人の認証必須）のみ。
