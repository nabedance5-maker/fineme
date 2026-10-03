-- ✅ 本番適用済 2026-10-03
-- AI専属コンサル（右下の常駐吹き出し）。店舗ごとの道筋の進捗操作・時間のボトルネック・会話履歴を持つ。
-- 道筋そのもの（ステップの完了判定）は予約・顧客・LINE等の実データから都度計算するため保存しない。
-- service_role専用（公開ポリシーなし）。

CREATE TABLE IF NOT EXISTS provider_consultant_step_state (
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  step_key    TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('snoozed', 'skipped', 'done')),
  until       TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, step_key)
);

CREATE TABLE IF NOT EXISTS provider_consultant_bottlenecks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category         TEXT NOT NULL,
  label            TEXT NOT NULL,
  minutes_per_week INT,
  source           TEXT NOT NULL DEFAULT 'interview' CHECK (source IN ('interview', 'observed')),
  status           TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consultant_bottlenecks_provider ON provider_consultant_bottlenecks(provider_id, status);

CREATE TABLE IF NOT EXISTS provider_consultant_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consultant_messages_provider ON provider_consultant_messages(provider_id, created_at DESC);

-- 店舗ごとのコンサル設定（ヒアリング済みか等）
CREATE TABLE IF NOT EXISTS provider_consultant_settings (
  provider_id          UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  goal                 TEXT NOT NULL DEFAULT 'repeat_rate',
  interview_done_at    TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE provider_consultant_step_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_consultant_bottlenecks ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_consultant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_consultant_settings ENABLE ROW LEVEL SECURITY;
