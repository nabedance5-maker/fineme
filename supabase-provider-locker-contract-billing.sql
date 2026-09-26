-- ✅ 本番適用済 2026-09-26
-- でお要望2026-09-26：「ロッカー管理タブで手動割当した場合も自動課金できるように」。
-- 契約者が既にオンライン入会でカード登録済みの会員なら、そのサブスクにロッカー代を
-- 追加項目として差し込んで自動課金する。カード未登録の場合はStripe Checkoutの
-- 支払いリンクを発行し、本人へ送るかどうかは店舗側の運用に委ねる。
ALTER TABLE provider_locker_contracts ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT;
ALTER TABLE provider_locker_contracts ADD COLUMN IF NOT EXISTS payment_link_url TEXT;
