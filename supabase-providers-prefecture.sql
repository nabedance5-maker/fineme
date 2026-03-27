-- providers に都道府県カラムを追加（エリアフィルターの主キーとして使用）
-- ✅ 本番適用済 YYYY-MM-DD

ALTER TABLE providers ADD COLUMN IF NOT EXISTS prefecture TEXT DEFAULT '';
