-- ✅ 本番適用済 2026-08-17
-- 予約前日リマインドのクイックリプライ確認（予約・再来店リマインドSaaS フェーズ3-E・ノーショー対策）

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS confirmed_by_customer BOOLEAN DEFAULT false;
