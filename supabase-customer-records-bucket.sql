-- ✅ 本番適用済 2026-10-10
-- 店舗のお客様の記録写真（姿勢分析・健診アドバイス）用の非公開バケット。
-- 健診結果の写真は要配慮個人情報になりうるため、公開バケット provider-photos から分離する。
-- アクセスは service_role（店舗本人の認証を通したAPIルート）のみ。表示は期限付き署名URLで行う。
-- RLSポリシーは作らない＝anon/authenticated からは直接読めない（service_role はRLSを迂回する）。
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-records', 'customer-records', false)
ON CONFLICT (id) DO UPDATE SET public = false;
