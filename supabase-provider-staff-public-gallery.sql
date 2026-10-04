-- ✅ 本番適用済 2026-10-04
-- スタッフの公開/非公開と、スタッフごとの実績写真ギャラリー。
-- is_public=false のスタッフは公開店舗ページ（スタッフ紹介・指名候補）・検索結果のスタッフ数に出さない。
ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS provider_staff_gallery (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES provider_staff(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  caption     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provider_staff_gallery_staff ON provider_staff_gallery(staff_id, created_at);
ALTER TABLE provider_staff_gallery ENABLE ROW LEVEL SECURITY;
