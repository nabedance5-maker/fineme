-- ✅ 本番適用済 2026-09-18
-- 予約締切の指定方法を2種類から選べるようにする（でお要望2026-09-18：
-- 「予約締め切りは前日の何時までというのと、予約の何時間前までを選べるように」）。
-- ・hours（既存・既定）：予約開始の◯時間前まで受付
-- ・day_before_time：予約日の前日◯時まで受付（固定時刻）
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS booking_cutoff_mode TEXT NOT NULL DEFAULT 'hours' CHECK (booking_cutoff_mode IN ('hours', 'day_before_time'));
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS booking_cutoff_time TEXT;
