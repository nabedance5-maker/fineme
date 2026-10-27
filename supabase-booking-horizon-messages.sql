-- ✅ 本番適用済 2026-10-27
-- 予約を何日先まで受け付けるか・お客様に自動で送るメッセージを店舗ごとに決める（でお要望 2026-10-27）
-- booking_horizon_days：今日から何日先まで予約できるか（NULL＝60日）
-- booking_messages：{ instant: 即時予約が確定した時, request: 予約リクエストを受け付けた時 }（空ならFinemeの既定文）
ALTER TABLE providers ADD COLUMN IF NOT EXISTS booking_horizon_days INT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS booking_messages JSONB NOT NULL DEFAULT '{}'::jsonb;
