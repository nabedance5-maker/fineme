-- ✅ 本番適用済 2026-10-03
-- AI専属コンサル: 店舗が自分で選ぶ目標（複数）と自由記述。未設定でもシステム自体は使える。
ALTER TABLE provider_consultant_settings
  ADD COLUMN IF NOT EXISTS goals TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS goal_note TEXT,
  ADD COLUMN IF NOT EXISTS goals_set_at TIMESTAMPTZ;
