-- ✅ 本番適用済 2026-08-12
--
-- curated_posts: New Me Map・Mirror結果面に紐づける、キュレーション済みの
-- Instagram/TikTok投稿プール。
--
-- 背景（でお指摘 2026-08-12）：Finemeは「情報が溢れすぎて自分に必要なものが
-- 分からなくなっている人に、地図と羅針盤を渡す」サービス。ネット上の有益な
-- 情報（Instagram/TikTok投稿等）を無視せず、ステップの具体的な内容＋ユーザー
-- 属性の粒度でマッチングして組み込んでこそ本当の地図と羅針盤になる、という思想。
--
-- 投稿の自動発見はプラットフォーム側のAPI制約上不可能（Meta App Review必須＋
-- 週30ハッシュタグ制限）。Claudeが候補をWebSearchで提案し、でおが承認する
-- キュレーション方式。affiliate_products（商品プール）と同型の設計。
--
-- 著作権の扱い（2026-08-12確定）：プレーンリンク（サムネ無し）は許諾不要、
-- サムネイル画像・埋め込みは投稿者の許諾が必要（Instagram社ポリシー）。
-- そのため「表示するか」と「サムネ付きで見せるか」を別ゲートにしている：
--   表示可否   = status='approved' AND is_active
--   サムネ表示 = 上記に加えて permission_confirmed=true
-- 管理画面で permission_confirmed を切り替えるだけで、Map側は再生成不要で
-- 次回描画時に自動でサムネ付き表示へ切り替わる（related_post_idの紐付け自体は
-- AI生成時に固定、投稿データは毎回 /api/curated-posts から最新値を取得するため）。

CREATE TABLE IF NOT EXISTS curated_posts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform           text NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  post_url           text NOT NULL,
  thumbnail_url      text,
  creator_handle     text,
  axis               text CHECK (axis IN ('skin', 'eyebrow', 'hair', 'body', 'teeth', 'nail', 'fashion', 'hairremoval')),
  topic_tags         text[] NOT NULL DEFAULT '{}',   -- 細かいサブトピック（例: '洗顔','美容液','毛穴'）
  target_concerns    text[] NOT NULL DEFAULT '{}',   -- affiliate_products.target_concerns と同じ語彙
  caption            text NOT NULL,                   -- AIへの文脈提供用の要約＋表示用キャプション
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  permission_confirmed boolean NOT NULL DEFAULT false,
  is_active          boolean NOT NULL DEFAULT true,
  added_by           text DEFAULT 'claude_websearch',
  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS curated_posts_axis_idx ON curated_posts(axis);
CREATE INDEX IF NOT EXISTS curated_posts_status_idx ON curated_posts(status);

-- RLS: 読み取りは全員OK（APIサーバー側で status/is_active フィルタする）、書き込みはサービスロールのみ
ALTER TABLE curated_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "curated_posts_read_all" ON curated_posts FOR SELECT USING (true);
