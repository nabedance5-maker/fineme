-- ✅ 本番適用済 2026-10-03
-- AI専属コンサルの本格化：店舗の自由記述ゴール×実データ×時期から作る戦略(plan)と、
-- 日次/週次/月次のタスク(tasks)、会話で覚えた店舗の事実(facts)。
-- 固定の導入チェックリスト(STEPS)は「導入の準備状況」に格下げし、道筋の本体はここに持つ。
CREATE TABLE IF NOT EXISTS provider_consultant_plans (
  provider_id  UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  goal_text    TEXT,
  diagnosis    TEXT,
  strategy     JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS provider_consultant_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  why         TEXT,
  cadence     TEXT NOT NULL DEFAULT 'once' CHECK (cadence IN ('daily','weekly','monthly','once')),
  due_date    DATE,
  period_key  TEXT,
  tab         TEXT,
  source      TEXT NOT NULL DEFAULT 'plan' CHECK (source IN ('plan','chat','user')),
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','skipped')),
  done_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_consultant_tasks_provider_idx ON provider_consultant_tasks(provider_id, status, created_at DESC);

ALTER TABLE provider_consultant_settings ADD COLUMN IF NOT EXISTS facts TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE provider_consultant_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_consultant_tasks ENABLE ROW LEVEL SECURITY;
-- 公開ポリシーなし。service_role（APIルート、店舗本人の認証必須）のみ。
