-- ✅ 本番適用済 2026-10-27
-- メニューごとに「お一人様◯回まで」予約できるか（でお要望 2026-10-27：体験メニューを何回も予約されて困る）。NULL＝制限なし
-- 数えるのは、キャンセル・お断り・期限切れ以外の予約（来店済みも含む）。同じアカウント・同じメールアドレス・同じ電話番号を同じ人とみなす
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS per_customer_limit INT CHECK (per_customer_limit IS NULL OR per_customer_limit >= 1);
