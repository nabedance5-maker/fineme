-- ✅ 本番適用済 2026-08-24
-- 診断起点LP自動生成（店舗SaaS実装仕様書 SAAS-015・SAAS-016）
-- store_experience_menus / store_cases（元仕様）を、既存のprovidersテーブルに
-- 合わせてprovider_*に読み替えて実装。

CREATE TABLE IF NOT EXISTS provider_experience_menus (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  price        INTEGER NOT NULL,
  duration_min INTEGER NOT NULL,
  axes         TEXT[] NOT NULL DEFAULT '{}', -- Mirrorの7軸語彙(eyebrow/skin/hair/expression/posture/body/fashion)
  description  TEXT,
  images       TEXT[] DEFAULT '{}',
  is_active    BOOLEAN DEFAULT true,
  sort_order   INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE provider_experience_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active experience menus"
  ON provider_experience_menus FOR SELECT
  USING (is_active = true);
-- 書き込みはservice_role（APIルート）のみ

-- 施術事例（Before/After）。user_idは元仕様に無かったカラムだが、
-- 「本人の許可なく事例を公開しない」ためには承認者を特定できる必要があり追加した。
-- 承認は /api/me/cases/[id]/approve でユーザー本人のみが行える。
CREATE TABLE IF NOT EXISTS provider_cases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  menu_id          UUID REFERENCES provider_experience_menus(id) ON DELETE SET NULL,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type        TEXT,        -- 表示用のタイプ名（例：知的クール）。任意
  axis             TEXT NOT NULL,
  before_score     INTEGER NOT NULL,
  after_score      INTEGER NOT NULL,
  image_url        TEXT,
  approved_by_user BOOLEAN DEFAULT false,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE provider_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read approved cases"
  ON provider_cases FOR SELECT
  USING (approved_by_user = true);
-- 書き込みはservice_role（APIルート）のみ
