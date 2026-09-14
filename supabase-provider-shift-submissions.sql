-- ✅ 本番適用済 2026-09-14
-- スタッフのシフト希望「提出完了」記録（でお要望2026-09-14）。
-- 日付ごとの希望は選んだ瞬間に自動保存する方式に変更したため、「提出する」操作自体は
-- 個々の希望の保存トリガーではなく、「これで全部です」という完了の合図として別途記録する。
CREATE TABLE IF NOT EXISTS provider_shift_submissions (
  period_id UUID NOT NULL REFERENCES provider_shift_periods(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES provider_staff(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (period_id, staff_id)
);
