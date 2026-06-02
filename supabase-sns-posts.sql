-- ✅ 本番適用済 2026-06-01
-- SNS投稿ログ＋週次戦略の保存（PDCAの土台）
-- channel='x'        … 実際に生成したX投稿（被り防止・振り返り材料）
-- channel='strategy' … 週次レトロスペクティブが出した「来週の方針」（日次生成が参照）
CREATE TABLE IF NOT EXISTS sns_posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel    TEXT NOT NULL DEFAULT 'x',
  post_type  TEXT,
  text       TEXT,
  posted     BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sns_posts_channel_created ON sns_posts(channel, created_at DESC);
