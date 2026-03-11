-- ── stories テーブル（体験談）────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id    uuid REFERENCES reservations(id) ON DELETE SET NULL,
  user_id           uuid,
  provider_id       text NOT NULL DEFAULT '',
  service_name      text,
  concern_before    text NOT NULL,   -- Q1: 変える前の悩み
  change_after      text NOT NULL,   -- Q2: どんな変化があったか
  love_impact       text,            -- Q3: 恋愛・人間関係への影響
  recommend_to      text,            -- Q4: おすすめしたい人
  tags              text[] DEFAULT '{}',
  rating            int DEFAULT 5,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note        text,            -- 運営メモ
  published_at      timestamptz,
  created_at        timestamptz DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS stories_provider_id_idx ON stories(provider_id);
CREATE INDEX IF NOT EXISTS stories_status_idx ON stories(status);
CREATE INDEX IF NOT EXISTS stories_created_at_idx ON stories(created_at DESC);

-- RLS 有効化
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- ポリシー: 誰でも approved の体験談を読める
CREATE POLICY "approved stories are public" ON stories
  FOR SELECT USING (status = 'approved');

-- ポリシー: service_role（APIサーバー）は全操作可能
CREATE POLICY "service role full access" ON stories
  FOR ALL USING (auth.role() = 'service_role');
