-- ✅ 本番適用済 2026-03-25
-- ⚠️ 本番適用前: Supabaseダッシュボード → SQL Editorで実行
-- providers テーブル: 欠落カラムを一括追加

-- プロフィール基本
ALTER TABLE providers ADD COLUMN IF NOT EXISTS guide_message          TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS unique_strengths       TEXT;

-- 比較・信頼シグナルフィールド
ALTER TABLE providers ADD COLUMN IF NOT EXISTS nearest_station        TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS online_available       BOOLEAN DEFAULT FALSE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS payment_methods        TEXT[] DEFAULT '{}';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS cancellation_policy    TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS first_session_desc     TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS experience_years       INTEGER;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS credentials            TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS response_hours         INTEGER;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS trial_available        BOOLEAN DEFAULT FALSE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS trial_desc             TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS facility_photos        TEXT[] DEFAULT '{}';
