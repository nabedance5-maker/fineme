-- ✅ 本番適用済 2026-10-27
-- シフトを「期間」から切り離す（でお指摘 2026-10-27：「対象の期間っていうのいらないって何回言ったらわかるん？
-- 掲載者管理画面側で自由にカレンダーとかでここからここまでを確定させるみたいにできればいい」）。
--  ・provider_shift_entries：お店（provider_id）＋日付で持つ。期間（period_id）は無くてよい
--  ・provider_shift_confirmed_days：確定は日付ごと（カレンダーで選んだ日をまとめて確定・取り消し）
--  ・provider_shift_day_patterns：日ごとの必要人数パターンもお店＋日付で持つ
--  ・providers.shift_link_token：シフト希望の提出リンクはお店に1つ（スタッフは名前とパスワードで入る）
ALTER TABLE provider_shift_entries ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES providers(id) ON DELETE CASCADE;
UPDATE provider_shift_entries e SET provider_id = p.provider_id FROM provider_shift_periods p WHERE e.period_id = p.id AND e.provider_id IS NULL;
DELETE FROM provider_shift_entries WHERE provider_id IS NULL;
ALTER TABLE provider_shift_entries ALTER COLUMN provider_id SET NOT NULL;
ALTER TABLE provider_shift_entries ALTER COLUMN period_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS provider_shift_entries_provider_date ON provider_shift_entries (provider_id, date);

CREATE TABLE IF NOT EXISTS provider_shift_confirmed_days (
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider_id, date)
);
ALTER TABLE provider_shift_confirmed_days ENABLE ROW LEVEL SECURITY;
INSERT INTO provider_shift_confirmed_days (provider_id, date)
SELECT p.provider_id, d::date FROM provider_shift_periods p, generate_series(p.period_start, p.period_end, interval '1 day') d
 WHERE p.status = 'confirmed'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS provider_shift_day_patterns (
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pattern_id UUID NOT NULL REFERENCES provider_shift_patterns(id) ON DELETE CASCADE,
  PRIMARY KEY (provider_id, date)
);
ALTER TABLE provider_shift_day_patterns ENABLE ROW LEVEL SECURITY;
INSERT INTO provider_shift_day_patterns (provider_id, date, pattern_id)
SELECT p.provider_id, dp.date, dp.pattern_id FROM provider_shift_period_day_patterns dp JOIN provider_shift_periods p ON p.id = dp.period_id
ON CONFLICT DO NOTHING;

ALTER TABLE providers ADD COLUMN IF NOT EXISTS shift_link_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS providers_shift_link_token ON providers (shift_link_token);
