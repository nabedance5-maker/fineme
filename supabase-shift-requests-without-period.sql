-- ✅ 本番適用済 2026-10-16
-- シフト希望を「期間」から切り離す（でお指摘 2026-10-16：最初に期間を作らせるのは不要な手間で分かりづらい。
-- 希望は期間と関係なく出せて、お店ごとの提出ルールがあればよい。どの期間を作るかはシフトを作る時に選ぶ）。
--  ・provider_shift_requests：店舗＋スタッフ＋日付で一意に。期間を消しても希望は消えない
--  ・provider_shift_window_submissions：提出ルールの区切り（例：11月分）ごとの「提出を完了」
--  ・provider_shift_settings.submit_cycle：何ごとに提出するか・締切・通知日
--  ・募集中(collecting)だった期間は「作成中(draft)」に（期間は、作るシフトの範囲としてだけ使う）

ALTER TABLE provider_shift_requests ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES providers(id) ON DELETE CASCADE;
UPDATE provider_shift_requests r SET provider_id = p.provider_id
  FROM provider_shift_periods p WHERE r.period_id = p.id AND r.provider_id IS NULL;
DELETE FROM provider_shift_requests WHERE provider_id IS NULL;
-- 期間が重なっていて同じ日の希望が2つある場合は、新しいほうを残す
DELETE FROM provider_shift_requests a USING provider_shift_requests b
  WHERE a.provider_id = b.provider_id AND a.staff_id = b.staff_id AND a.date = b.date AND a.type = b.type
    AND (a.updated_at < b.updated_at OR (a.updated_at = b.updated_at AND a.id < b.id));
ALTER TABLE provider_shift_requests ALTER COLUMN provider_id SET NOT NULL;
ALTER TABLE provider_shift_requests DROP CONSTRAINT IF EXISTS provider_shift_requests_period_id_staff_id_date_type_key;
ALTER TABLE provider_shift_requests DROP CONSTRAINT IF EXISTS provider_shift_requests_period_id_fkey;
ALTER TABLE provider_shift_requests ALTER COLUMN period_id DROP NOT NULL;
UPDATE provider_shift_requests SET period_id = NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'provider_shift_requests_provider_staff_date_type_key') THEN
    ALTER TABLE provider_shift_requests ADD CONSTRAINT provider_shift_requests_provider_staff_date_type_key UNIQUE (provider_id, staff_id, date, type);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_shift_requests_provider_date ON provider_shift_requests(provider_id, date);

CREATE TABLE IF NOT EXISTS provider_shift_window_submissions (
  provider_id  UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  staff_id     UUID NOT NULL REFERENCES provider_staff(id) ON DELETE CASCADE,
  window_start DATE NOT NULL,
  window_end   DATE NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, staff_id, window_start)
);
INSERT INTO provider_shift_window_submissions (provider_id, staff_id, window_start, window_end, submitted_at)
  SELECT p.provider_id, s.staff_id, p.period_start, p.period_end, s.submitted_at
  FROM provider_shift_submissions s JOIN provider_shift_periods p ON p.id = s.period_id
  ON CONFLICT DO NOTHING;
ALTER TABLE provider_shift_window_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON provider_shift_window_submissions FROM anon, authenticated;

ALTER TABLE provider_shift_settings ADD COLUMN IF NOT EXISTS submit_cycle JSONB;
-- すでにシフトを使っている店舗は「1か月ごと・前の月の◯日締め」で始める（直近の期間の締切日を引き継ぐ。無ければ20日）
INSERT INTO provider_shift_settings (provider_id, submit_cycle)
  SELECT DISTINCT ON (provider_id) provider_id,
    jsonb_build_object('cycle', 'monthly', 'deadline_day', COALESCE(EXTRACT(DAY FROM request_deadline)::int, 20), 'deadline_days_before', 7, 'notify_days_before', to_jsonb(COALESCE(notify_days_before, '{1,0}')))
  FROM provider_shift_periods ORDER BY provider_id, period_start DESC
  ON CONFLICT (provider_id) DO UPDATE SET submit_cycle = COALESCE(provider_shift_settings.submit_cycle, EXCLUDED.submit_cycle);

UPDATE provider_shift_periods SET status = 'draft' WHERE status = 'collecting';
