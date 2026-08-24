-- 未適用（本番Supabaseで実行してください）
-- 休眠判定の店舗別カスタマイズ（店舗SaaS実装仕様書 SAAS-010）
-- no_visit_daysを超えて来店（user_service_log_visits）が無い顧客を「休眠(dormant)」と
-- 判定するための、店舗ごとのしきい値。既存のユーザー想定超過/店舗推奨超過セグメント
-- （daysUntilIdeal系）とは独立した「絶対的な未来店日数」による判定軸として使う。

CREATE TABLE IF NOT EXISTS provider_dormant_settings (
  provider_id  UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  no_visit_days INTEGER DEFAULT 90,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE provider_dormant_settings ENABLE ROW LEVEL SECURITY;
-- publicポリシーを作らない＝service_role（APIルート）のみアクセス可能
