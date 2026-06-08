-- ✅ 本番適用済 2026-06-08

-- navi月次スナップショット
CREATE TABLE IF NOT EXISTS navi_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year_month        TEXT NOT NULL,
  navi_steps        JSONB,
  axis_progress     JSONB,
  mirror_session_id UUID REFERENCES mirror_sessions(id) ON DELETE SET NULL,
  mirror_analysis   JSONB,
  step_outcomes     JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_navi_snapshots_user_month
  ON navi_snapshots(user_id, year_month DESC);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_monthly_snapshot TIMESTAMPTZ;

ALTER TABLE navi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "navi_snapshots_select_own"
  ON navi_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "navi_snapshots_insert_own"
  ON navi_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "navi_snapshots_update_own"
  ON navi_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "navi_snapshots_delete_own"
  ON navi_snapshots FOR DELETE
  USING (auth.uid() = user_id);
