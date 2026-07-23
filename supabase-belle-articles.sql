-- Belle記事トラック対応：features テーブルに track 列追加
-- ✅ 本番適用済 2026-07-23

ALTER TABLE features ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'fineme'
  CHECK (track IN ('fineme', 'belle'));

CREATE INDEX IF NOT EXISTS idx_features_track_status
  ON features (track, status, published_at DESC);
