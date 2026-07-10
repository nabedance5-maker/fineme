-- Threads API 連携：自動投稿した投稿と、そのインサイト（分析）を保存するテーブル
-- threads-draft が自動投稿時に1行 insert、threads-insights が指標を update する。
-- 実行後、この先頭に「-- ✅ 本番適用済 YYYY-MM-DD」を追記してコミットすること。

create table if not exists threads_posts (
  id            bigint generated always as identity primary key,
  media_id      text unique not null,          -- 本文投稿の Threads media id
  category      text,                           -- value / diary / note
  body          text,
  reply1        text,
  reply2        text,
  posted_at     timestamptz not null default now(),
  -- インサイト（threads-insights が定期更新）
  views         integer,
  likes         integer,
  replies       integer,
  reposts       integer,
  quotes        integer,
  shares        integer,
  followers_at  integer,                        -- 投稿時点のフォロワー数（伸びの文脈用）
  last_checked  timestamptz
);

create index if not exists threads_posts_posted_at_idx on threads_posts (posted_at desc);
