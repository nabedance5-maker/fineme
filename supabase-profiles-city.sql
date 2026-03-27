-- profiles に市区町村カラムを追加
-- ✅ 本番適用済 YYYY-MM-DD

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
