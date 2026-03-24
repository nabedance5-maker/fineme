-- ✅ 本番適用済 2026-03-24
-- profiles に step_done カラムを追加（ステップ完了チェックのSupabase保存）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS step_done JSONB DEFAULT '{}'::jsonb;
