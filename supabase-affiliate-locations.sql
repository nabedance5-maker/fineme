-- アフィリエイト複数エリア対応 + 掲載注意事項カラム追加
-- 実行後: ✅ 本番適用済 と追記すること

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS location_areas JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS affiliate_notes TEXT;
