-- ✅ 本番適用済 2026-10-27
-- メニューごとに、お客様の予約画面でスタッフを選ばせないか（でお要望 2026-10-27：体験メニューなどはスタッフを出さずに予約させたい）
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS hide_staff_select BOOLEAN NOT NULL DEFAULT FALSE;
