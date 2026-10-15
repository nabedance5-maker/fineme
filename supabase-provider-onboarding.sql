-- ✅ 本番適用済 2026-10-15
-- 掲載者管理画面のオンボーディング（初回ログイン時の質問）の回答と完了日時。
-- 困りごとの自由記述を含むため providers（anon が公開行を読める）には置かず、service_role 専用テーブルにする。
-- 行が無い・completed_at が NULL の店舗に質問を出す。
ALTER TABLE providers DROP COLUMN IF EXISTS onboarding;
ALTER TABLE providers DROP COLUMN IF EXISTS onboarding_completed_at;
CREATE TABLE IF NOT EXISTS provider_onboarding (
  provider_id      UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  answers          JSONB NOT NULL DEFAULT '{}'::jsonb,
  applied_features JSONB,
  skipped          BOOLEAN NOT NULL DEFAULT false,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE provider_onboarding ENABLE ROW LEVEL SECURITY;
