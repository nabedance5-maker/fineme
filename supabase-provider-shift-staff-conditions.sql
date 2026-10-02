-- ✅ 本番適用済 2026-10-02
-- スタッフ別の労働条件（でお要望2026-10-02）。
-- 雇用形態（正社員・パート・アルバイト・業務委託）や勤務上限・休日確保の日数がスタッフごとに
-- 違うため、シフト自動作成と確定前チェックが労基法違反を生まないよう条件を持たせる。
-- 空欄(NULL)は「既定値」：業務委託以外は法定の目安（1日8h・週40h・週1日以上休み・連続6日まで）、
-- 業務委託は店舗が入れた上限のみ適用。
CREATE TABLE IF NOT EXISTS provider_shift_staff_conditions (
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES provider_staff(id) ON DELETE CASCADE,
  employment_type TEXT NOT NULL DEFAULT 'fulltime' CHECK (employment_type IN ('fulltime', 'parttime', 'arbeit', 'contractor', 'other')),
  max_hours_per_day NUMERIC,
  max_hours_per_week NUMERIC,
  max_hours_per_month NUMERIC,
  max_days_per_week INT,
  max_days_per_month INT,
  min_days_off_per_week INT,
  max_consecutive_days INT,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, staff_id)
);
ALTER TABLE provider_shift_staff_conditions ENABLE ROW LEVEL SECURITY;
