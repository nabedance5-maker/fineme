-- ✅ 本番適用済 2026-05-29
-- Mirror月次無料カウント + 解約日時カラム追加
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mirror_monthly_free_count  INT          DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mirror_monthly_free_month  TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_cancelled_at  TIMESTAMPTZ  DEFAULT NULL;
