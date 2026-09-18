-- ✅ 本番適用済 2026-09-18
-- ロッカー代の自動課金対応（でお要望2026-09-18：「ロッカー代を自動で一緒に課金したい」）。
-- 入会手続きでロッカーを選んだお客様は、承認時にプランの月額とロッカー代を
-- 同じStripeサブスクリプションの2明細として一緒に課金する。
-- ロッカーの金額（monthly_fee）は店舗がいつでも変更できるため、Stripeの
-- price_data（サブスク明細作成時にその場でPriceを都度生成する方式）を使い、
-- Priceそのものはキャッシュしない。Productだけは使い回すため1個だけ持たせる。
ALTER TABLE public.provider_lockers ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
