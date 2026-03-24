-- ✅ 本番適用済 2026-03-24
-- provider_services テーブルに suitable_path_types カラムを追加
-- Supabase ダッシュボード > SQL Editor で実行してください
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS suitable_path_types text[];
