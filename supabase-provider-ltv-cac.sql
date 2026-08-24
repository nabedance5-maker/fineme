-- 未適用（本番Supabaseで実行してください）
-- 店舗単位のLTV・CAC分析（店舗SaaS実装仕様書 SAAS-041・要件を一部変更して実装）
--
-- 元仕様は「メニュー別」の集計を想定していたが、来店記録(reservations/
-- user_service_logs)がどの体験メニュー(provider_experience_menus)に対応する
-- ものかを紐づけるカラムが無く、正確なメニュー別集計ができない状態だった。
-- 誤った/こじつけの数字を経営判断材料として出す方がリスクが大きいため、
-- 今回は店舗単位（全体）の集計にスコープを縮小した。
--
-- 広告費（店舗が個別に払っている集客コスト）と粗利率は自動算出できないため、
-- 店舗が任意で入力する設定値として保持する。

CREATE TABLE IF NOT EXISTS provider_ltv_cac_settings (
  provider_id    UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  monthly_ad_cost INTEGER DEFAULT 0,   -- 円。店舗が個別に払っている広告費（任意入力）
  gross_margin_pct INTEGER DEFAULT 70, -- 粗利率（%）。既定値は暫定
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE provider_ltv_cac_settings ENABLE ROW LEVEL SECURITY;
-- publicポリシーを作らない＝service_role（APIルート）のみアクセス可能
