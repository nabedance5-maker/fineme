-- features テーブル（特集記事）
-- ✅ 本番適用済み 2026-03-26

CREATE TABLE IF NOT EXISTS features (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT UNIQUE,
  title        TEXT NOT NULL,
  summary      TEXT DEFAULT '',
  description  TEXT DEFAULT '',
  category     TEXT DEFAULT '',
  thumbnail    TEXT DEFAULT '',
  reading_time INTEGER DEFAULT 5,
  body         TEXT DEFAULT '',       -- feature builder HTML（管理画面から入力）
  blocks       JSONB DEFAULT NULL,    -- 構造化ブロック（手動JSON）
  status       TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'private')),
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: 公開記事は誰でも読める
ALTER TABLE features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public can read published features"
  ON features FOR SELECT TO anon
  USING (status = 'published');

-- インデックス
CREATE INDEX IF NOT EXISTS features_status_idx ON features (status);
CREATE INDEX IF NOT EXISTS features_published_at_idx ON features (published_at DESC);
