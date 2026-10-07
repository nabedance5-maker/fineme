-- ✅ 本番適用済 2026-10-07
-- シフト希望の提出のしかた（店舗の初期設定と、募集ごとの設定）
ALTER TABLE provider_shift_settings ADD COLUMN IF NOT EXISTS request_format jsonb;
ALTER TABLE provider_shift_periods ADD COLUMN IF NOT EXISTS request_format jsonb;
