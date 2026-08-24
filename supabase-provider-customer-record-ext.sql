-- ✅ 本番適用済 2026-08-24
-- 顧客カルテ拡張（店舗SaaS実装仕様書 SAAS-001・簡略版）
-- 元チケットは visit_count/last_visit_at/ltv_predicted も列として持つ設計だったが、
-- 来店回数・最終来店日は user_service_logs / user_service_log_visits から都度算出する方が
-- 二重管理・同期漏れが起きず安全なため、実装時にそちらへ変更した（要でお確認）。
-- ここでは「保存しないと表現できない」ものだけを列として追加する：担当スタッフの割当と、
-- Phase3で使う予測LTVの置き場（今は常にNULL）。

ALTER TABLE provider_customer_notes ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES provider_staff(id) ON DELETE SET NULL;
ALTER TABLE provider_customer_notes ADD COLUMN IF NOT EXISTS ltv_predicted INTEGER; -- 円。Phase3のLTV/CAC分析実装まではNULL運用
