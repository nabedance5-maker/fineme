-- ✅ 本番適用済 2026-10-27
-- 入会金をいつ請求するか（でお要望 2026-10-27：3か月先から入会したい方に今日入会金を取るのは解せない。ただし今欲しいお店もある）
--  approval    … お店が承認した時（これまで通り）
--  first_dues  … 最初の月会費のお支払いと一緒に（入会日が先なら、その時まで請求しない）
ALTER TABLE provider_membership_settings ADD COLUMN IF NOT EXISTS initial_fee_timing TEXT NOT NULL DEFAULT 'approval'
  CHECK (initial_fee_timing IN ('approval', 'first_dues'));
