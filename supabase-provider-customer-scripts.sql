-- 「接客の引き出し」タブのお店専用パーソナライズ結果のキャッシュ。
-- lib/customer-scripts.js の7軸汎用スクリプト（でお指摘 2026-09-01: 内容が薄く
-- どの店舗にも同じ内容が出ているだけで存在価値がない、を受けて対応）を、
-- 実際にこの店舗に来店したお客様のカルテ記録・施術事例・体験談だけを事実として
-- AI(Claude Haiku 4.5)が軸ごとに生成したお店専用の内容に置き換える。
-- 実データが無い軸は生成せず、フロント側で従来の汎用スクリプトにフォールバックする
-- （store固有の主張を無から作らない）。
CREATE TABLE IF NOT EXISTS provider_customer_scripts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE UNIQUE,
  items         JSONB NOT NULL DEFAULT '[]', -- [{ axis, label, openers:[...], notePoints:[...] }]
  source_hash   TEXT NOT NULL,
  generated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE provider_customer_scripts ENABLE ROW LEVEL SECURITY;
-- 店舗の接客ノウハウ（他のお客様のカルテ由来）が漏れないよう、公開読み取りは許可しない。
-- 書き込み・読み取りともにservice_role（APIルート、店舗本人の認証必須）のみ。
