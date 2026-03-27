-- providers に詳細住所・座標・市区町村カラムを追加
-- ✅ 本番適用済 YYYY-MM-DD（SQL実行後に日付を記入してください）

ALTER TABLE providers ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS lat FLOAT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS lon FLOAT;
