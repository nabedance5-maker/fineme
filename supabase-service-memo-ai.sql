-- ✅ 本番適用済 2026-10-15
-- 接客の引き出し：来店前の接客メモ（AIの「今日聞くこと」「次回の一言」）のキャッシュ
-- 予約1件ごとに、渡した事実のハッシュが変わらない限り再生成しない。
-- service_role 専用（公開 read ポリシーは作らない）。
CREATE TABLE IF NOT EXISTS provider_service_memo_ai (
  reservation_id UUID PRIMARY KEY REFERENCES reservations(id) ON DELETE CASCADE,
  provider_id    UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  source_hash    TEXT NOT NULL,
  content        JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_service_memo_ai_provider_idx ON provider_service_memo_ai (provider_id);
ALTER TABLE provider_service_memo_ai ENABLE ROW LEVEL SECURITY;
