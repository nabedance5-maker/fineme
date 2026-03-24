-- ✅ 本番適用済 2026-03-24
-- provider_services テーブルに変容設計フィールドを追加
-- Supabase ダッシュボード > SQL Editor で実行してください
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS transformation_promise text;
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS target_axis text;
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS before_text text;
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS after_text text;
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS benefit_list text[];
