-- AI④ 内部リンク用：記事テーブルに related_slugs カラムを追加
-- ✅ 本番適用済 YYYY-MM-DD
ALTER TABLE features ADD COLUMN IF NOT EXISTS related_slugs TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_features_related_slugs ON features USING GIN(related_slugs);
