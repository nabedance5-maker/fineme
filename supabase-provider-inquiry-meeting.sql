-- ✅ 本番適用済 2026-10-30
-- 問い合わせ＝オンライン相談の申し込み（2026-10-30 渡邉方針：問い合わせの次は必ずオンラインで話す）。ご希望の日時を残す
ALTER TABLE provider_inquiries ADD COLUMN IF NOT EXISTS meeting_wish TEXT;
