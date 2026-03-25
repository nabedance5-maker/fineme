-- ✅ 本番適用済 2026-03-25
-- アフィリエイトページ内画像URLの配列カラムを追加

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS facility_photos text[] DEFAULT '{}';
