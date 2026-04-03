-- ✅ 本番適用済 2026-04-03

CREATE TABLE IF NOT EXISTS video_schedule (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id int NOT NULL UNIQUE,
  video_title text NOT NULL,
  scheduled_date date,
  youtube_done boolean DEFAULT false,
  reels_done boolean DEFAULT false,
  tiktok_done boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS無効（business/ツールからのみアクセス・認証不要）
ALTER TABLE video_schedule DISABLE ROW LEVEL SECURITY;
