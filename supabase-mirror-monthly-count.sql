-- ✅ 本番適用済 2026-05-28
-- Mirror月次無料カウンター（月3回対応）
-- profiles テーブルに新カラムを追加

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mirror_monthly_free_count INT     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mirror_monthly_free_month TEXT    DEFAULT NULL;
