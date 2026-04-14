-- ✅ 本番適用済 2026-04-15
-- アフィリエイト複数エリア対応 + 掲載注意事項カラム追加

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS location_areas JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS affiliate_notes TEXT;
