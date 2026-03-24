-- ✅ 本番適用済 2026-03-24
-- ⚠️ 本番適用前: Supabaseダッシュボード → SQL Editorで実行

-- 掲載者プロフィール: 新テキストフィールド追加
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS ideal_client_desc       TEXT,
  ADD COLUMN IF NOT EXISTS client_before_state     TEXT,
  ADD COLUMN IF NOT EXISTS transformation_pattern  TEXT,
  ADD COLUMN IF NOT EXISTS best_fit_desc           TEXT,
  ADD COLUMN IF NOT EXISTS ai_match_profile        JSONB DEFAULT NULL;
