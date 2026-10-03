-- ✅ 本番適用済 2026-10-03
-- AI専属コンサルの記録と学習：ゴールの変遷、見立ての履歴、相談から学んだことの要約。
-- AIは次の見立て・相談のたびにこれらを読み、店舗ごとに積み上がる知識として使う。
CREATE TABLE IF NOT EXISTS provider_consultant_goal_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  goal_text   TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user','chat')),
  set_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_consultant_goal_history_idx ON provider_consultant_goal_history(provider_id, set_at DESC);

CREATE TABLE IF NOT EXISTS provider_consultant_plan_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  goal_text    TEXT,
  diagnosis    TEXT,
  focus        TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_consultant_plan_history_idx ON provider_consultant_plan_history(provider_id, generated_at DESC);

ALTER TABLE provider_consultant_settings ADD COLUMN IF NOT EXISTS memory_summary TEXT;
ALTER TABLE provider_consultant_settings ADD COLUMN IF NOT EXISTS summarized_until TIMESTAMPTZ;

ALTER TABLE provider_consultant_goal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_consultant_plan_history ENABLE ROW LEVEL SECURITY;
-- 公開ポリシーなし。service_role（APIルート、店舗本人の認証必須）のみ。

-- 既存のゴールを履歴の起点として取り込む
INSERT INTO provider_consultant_goal_history (provider_id, goal_text, source, set_at)
SELECT provider_id, goal_note, 'user', COALESCE(goals_set_at, NOW())
FROM provider_consultant_settings s
WHERE goal_note IS NOT NULL AND goal_note <> ''
  AND NOT EXISTS (SELECT 1 FROM provider_consultant_goal_history h WHERE h.provider_id = s.provider_id);
