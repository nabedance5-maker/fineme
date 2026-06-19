-- ✅ 本番適用要 2026-06-19
-- ── drama_episodes テーブル（ショートドラマ エピソード管理）────────────
CREATE TABLE IF NOT EXISTS drama_episodes (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  episode_no       int NOT NULL,
  title            text NOT NULL,
  cast_type        text NOT NULL DEFAULT 'solo' CHECK (cast_type IN ('solo', 'duo')),
  status           text NOT NULL DEFAULT 'idea'
                     CHECK (status IN ('idea', 'planning', 'shooting', 'editing', 'published')),
  publish_date     date,
  tiktok_url       text,
  instagram_url    text,
  youtube_url      text,
  impressions      int DEFAULT 0,
  followers_gained int DEFAULT 0,
  notes            text,
  script           text,  -- 台本（シーン・セリフ・アクション）
  created_at       timestamptz DEFAULT now()
);

-- ── drama_ideas テーブル（アイデアバンク）─────────────────────────────
CREATE TABLE IF NOT EXISTS drama_ideas (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  idea       text NOT NULL,
  status     text NOT NULL DEFAULT 'stock' CHECK (status IN ('stock', 'used')),
  created_at timestamptz DEFAULT now()
);

-- ── drama_kpis テーブル（フォロワー数 週次記録）──────────────────────
CREATE TABLE IF NOT EXISTS drama_kpis (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tiktok_followers     int DEFAULT 0,
  instagram_followers  int DEFAULT 0,
  youtube_followers    int DEFAULT 0,
  updated_at           timestamptz DEFAULT now()
);

-- KPI初期行（1行のみ）
INSERT INTO drama_kpis (tiktok_followers, instagram_followers, youtube_followers)
VALUES (0, 0, 0)
ON CONFLICT DO NOTHING;

-- インデックス
CREATE INDEX IF NOT EXISTS drama_episodes_status_idx ON drama_episodes(status);
CREATE INDEX IF NOT EXISTS drama_episodes_episode_no_idx ON drama_episodes(episode_no);

-- ── アイデアバンク初期シード ──────────────────────────────────────────
INSERT INTO drama_ideas (idea) VALUES
  ('マッチングアプリで全然マッチしなかった夜'),
  ('同窓会の招待状が来た夜'),
  ('自撮りを見てゾッとした夜'),
  ('好きな人に「普通だよね」と言われた夜'),
  ('鏡を見るのが怖くなった夜'),
  ('写真を断った夜');
