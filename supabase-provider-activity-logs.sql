-- ✅ 本番適用済 2026-10-03
-- 操作ログ：店舗ダッシュボードで「いつ・誰が・何を操作したか」を残す。
-- トラブル時の確認と、AIコンサルが店舗の操作パターンを学ぶための材料。
CREATE TABLE IF NOT EXISTS provider_activity_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operator_name TEXT,
  method        TEXT NOT NULL,
  route_key     TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'その他',
  action_label  TEXT NOT NULL,
  target_id     TEXT,
  summary       TEXT,
  detail        JSONB
);
CREATE INDEX IF NOT EXISTS provider_activity_logs_idx ON provider_activity_logs(provider_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS provider_activity_logs_cat_idx ON provider_activity_logs(provider_id, category, occurred_at DESC);

ALTER TABLE provider_activity_logs ENABLE ROW LEVEL SECURITY;
-- 公開ポリシーなし。service_role（APIルート、店舗本人の認証必須）のみ。
