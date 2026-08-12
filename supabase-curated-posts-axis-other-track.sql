-- ⏳ 未適用（オーナーが本番Supabaseで実行してください）
--
-- curated_posts に2点追加（でお指摘 2026-08-12）：
-- 1. axis に 'other'（姿勢・立ち振る舞い・所作など、既存8軸に当てはまらない投稿）を追加
-- 2. track（性別ターゲット: 'fineme'=男性向け中心 / 'belle'=女性向け中心 / 'common'=性別問わず有益）
--    を追加し、New Me Map・Mirror生成時のマッチングで自分のトラック外の投稿を除外できるようにする
--    （features テーブルと同じ、track取り違え事故を防ぐための設計）

ALTER TABLE curated_posts DROP CONSTRAINT IF EXISTS curated_posts_axis_check;
ALTER TABLE curated_posts ADD CONSTRAINT curated_posts_axis_check
  CHECK (axis IN ('skin', 'eyebrow', 'hair', 'body', 'teeth', 'nail', 'fashion', 'hairremoval', 'other'));

ALTER TABLE curated_posts ADD COLUMN IF NOT EXISTS track text NOT NULL DEFAULT 'common';
ALTER TABLE curated_posts DROP CONSTRAINT IF EXISTS curated_posts_track_check;
ALTER TABLE curated_posts ADD CONSTRAINT curated_posts_track_check
  CHECK (track IN ('fineme', 'belle', 'common'));

CREATE INDEX IF NOT EXISTS curated_posts_track_idx ON curated_posts(track);
