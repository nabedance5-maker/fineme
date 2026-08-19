-- ✅ 本番適用済 2026-08-17
-- 来店後クチコミ依頼の自動化（予約・再来店リマインドSaaS フェーズ3-A）

ALTER TABLE providers ADD COLUMN IF NOT EXISTS google_review_url TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS google_review_reminder_sent BOOLEAN DEFAULT false;
