-- ✅ 本番適用済 2026-10-16
-- 有給休暇（でお要望 2026-10-16：有給申請もできるとうれしい）。
-- 付与（店舗の勤怠の管理者が登録）と、申請（スタッフがシフト提出画面から出す → 管理者が承認・却下）。
CREATE TABLE IF NOT EXISTS provider_paid_leave_grants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES provider_staff(id) ON DELETE CASCADE,
  granted_on  DATE NOT NULL,
  expires_on  DATE NOT NULL,               -- 付与日から2年（労働基準法の時効）
  days        NUMERIC(4,1) NOT NULL CHECK (days > 0 AND days <= 40),
  note        TEXT,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_paid_leave_grants_staff_idx ON provider_paid_leave_grants (provider_id, staff_id);

CREATE TABLE IF NOT EXISTS provider_paid_leave_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  staff_id      UUID NOT NULL REFERENCES provider_staff(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  unit          TEXT NOT NULL DEFAULT 'full' CHECK (unit IN ('full', 'am', 'pm')),
  days          NUMERIC(2,1) NOT NULL CHECK (days IN (0.5, 1)),
  reason        TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  decided_at    TIMESTAMPTZ,
  decided_by    TEXT,
  decision_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_paid_leave_requests_staff_idx ON provider_paid_leave_requests (provider_id, staff_id, date);

ALTER TABLE provider_paid_leave_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_paid_leave_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON provider_paid_leave_grants FROM anon, authenticated;
REVOKE ALL ON provider_paid_leave_requests FROM anon, authenticated;
