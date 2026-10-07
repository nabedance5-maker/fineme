-- ✅ 本番適用済 2026-10-07
-- シフト希望の提出通知：スタッフのLINE連携と、店舗ごとの通知先設定
ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS line_user_id text;
ALTER TABLE provider_shift_settings ADD COLUMN IF NOT EXISTS submit_notify jsonb;
