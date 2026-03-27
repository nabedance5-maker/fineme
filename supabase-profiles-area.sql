-- profiles に居住エリア（都道府県）カラムを追加
-- 実行後: ✅ 本番適用済 を追記すること

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS area TEXT DEFAULT '';
