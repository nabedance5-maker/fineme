-- 診断起点LP(/provider/[slug]/for/[axis])の見出し・導入文・メニューごとの一言・締めの
-- AI生成コピーのキャッシュ。店舗が自分で書いた実テキスト(unique_strengths/philosophy/
-- guide_message/best_fit_desc/catchphrase/各メニューのdescription)だけを事実として渡し
-- Claude Haiku 4.5で生成する。数字・価格・実績等の事実はAIに触らせず、ここには入れない。
--
-- source_hash: 生成に使った元テキストのハッシュ。店舗がプロフィールやメニュー説明を
-- 編集してハッシュが変わったら、次回アクセス時に再生成する(app/api/providers/[slug]/
-- landing/route.js側で判定)。

CREATE TABLE IF NOT EXISTS provider_axis_intros (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  axis          TEXT NOT NULL,
  headline      TEXT,
  intro         TEXT,
  closing_line  TEXT,
  menu_hooks    JSONB DEFAULT '{}', -- { "<menu_id>": "一言フック" }
  source_hash   TEXT NOT NULL,
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, axis)
);

ALTER TABLE provider_axis_intros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read axis intros"
  ON provider_axis_intros FOR SELECT
  USING (true);
-- 書き込みはservice_role（APIルート）のみ
