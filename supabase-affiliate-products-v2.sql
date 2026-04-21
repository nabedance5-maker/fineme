-- ✅ 本番適用済 2026-04-21
-- affiliate_products: description / target_user / target_concerns 追加
ALTER TABLE affiliate_products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE affiliate_products ADD COLUMN IF NOT EXISTS target_user TEXT;
ALTER TABLE affiliate_products ADD COLUMN IF NOT EXISTS target_concerns TEXT[] DEFAULT '{}';
