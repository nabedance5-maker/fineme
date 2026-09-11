-- ✅ 本番適用済 2026-09-11
-- 出欠確認のデータモデル（hacomono/STORES網羅計画 Phase 5）。
-- 既存のLINE往復インフラ（lib/reservation-notify.jsのnotifyCustomerLine・
-- クイックリプライpostback・app/api/line/webhook/[providerId]/route.js）を
-- そのまま再利用する横展開のため、新規テーブルは最小限に留める。

CREATE TABLE IF NOT EXISTS provider_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  event_date   DATE NOT NULL,
  start_time   TEXT,
  memo         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_events_provider_idx ON provider_events(provider_id, event_date DESC);

CREATE TABLE IF NOT EXISTS provider_event_attendances (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES provider_events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  status     TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'attending', 'declined')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);
CREATE INDEX IF NOT EXISTS provider_event_attendances_event_idx ON provider_event_attendances(event_id);

ALTER TABLE provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_event_attendances ENABLE ROW LEVEL SECURITY;
-- 公開読み取りは許可しない。service_role（APIルート・LINE Webhookは本人確認込み）のみ。
