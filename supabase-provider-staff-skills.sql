-- 未適用（本番Supabaseで実行してください）
-- スタッフスキルマトリクス×タイプ（店舗SaaS実装仕様書 SAAS-030・SAAS-035）
--
-- provider_staffは既にSupabase上に存在するが、リポジトリに正式なCREATE TABLE文が
-- 見当たらなかった（Supabase側で直接作成された可能性）。以下はIF NOT EXISTSのため
-- 既存データに影響なく安全に実行できるが、既存のカラム型・制約と完全一致しているかは
-- 実行前にSupabase側で確認すること。

CREATE TABLE IF NOT EXISTS provider_staff (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id       UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  role              TEXT,
  bio               TEXT,
  photo_url         TEXT,
  experience_years  INTEGER,
  credentials       TEXT,
  is_featured       BOOLEAN DEFAULT false,
  sort_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE provider_staff ENABLE ROW LEVEL SECURITY;

-- 新規：得意タイプ・得意軸（SAAS-035）
ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS strong_types TEXT[] DEFAULT '{}';
ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS strong_axes TEXT[] DEFAULT '{}'; -- Mirrorの7軸語彙
