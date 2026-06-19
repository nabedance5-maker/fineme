-- ✅ 本番適用済 2026-06-20
-- ── drama_config（コンセプトキャンバス 1行固定）────────────────────────
CREATE TABLE IF NOT EXISTS drama_config (
  id         int PRIMARY KEY DEFAULT 1,
  canvas     jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
INSERT INTO drama_config (id, canvas) VALUES (1, '{}') ON CONFLICT DO NOTHING;

-- ── drama_refs（競合参照ボード）──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drama_refs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform        text CHECK (platform IN ('tiktok','instagram','youtube','other')),
  title           text NOT NULL,
  url             text,
  view_count      bigint,
  like_count      bigint,
  claude_analysis text,   -- Claudeの事前分析
  user_notes      text,   -- でおの追加メモ（任意）
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drama_refs_created_idx ON drama_refs(created_at DESC);
