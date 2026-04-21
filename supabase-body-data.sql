-- ✅ 本番適用済 2026-04-21
-- profiles.body_data: ユーザーの自己把握データ（肌タイプ・髪質・顔型など）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS body_data JSONB DEFAULT '{}'::jsonb;
