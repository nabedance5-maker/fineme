-- ✅ 本番適用済 2026-10-29
-- ロッカー代の支払いリンク（カード未登録のお客様）を、お客様のLINE・マイページに届け、払われたら契約に記録する（2026-10-29）。
-- ・stripe_subscription_id：支払いリンクから始まったロッカー代だけの月額（解約の時にこれを止める）
-- ・stripe_checkout_session_id：今開いている決済ページ（作り直す時に前のページを閉じる）
-- ・billing_started_at：お客様がカードを登録して引き落としが始まった日時
alter table provider_locker_contracts add column if not exists stripe_subscription_id text;
alter table provider_locker_contracts add column if not exists stripe_customer_id text;
alter table provider_locker_contracts add column if not exists stripe_checkout_session_id text;
alter table provider_locker_contracts add column if not exists billing_started_at timestamptz;
alter table provider_locker_contracts add column if not exists payment_notified_at timestamptz;
