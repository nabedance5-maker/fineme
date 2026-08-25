-- ✅ 本番適用済 2026-08-25
-- provider_inquiries に紹介コード記録用カラムを追加
-- /provider/join?ref=CODE → /provider/inquiry?ref=CODE で引き継いだ紹介コードを保存する
alter table provider_inquiries add column if not exists referral_code text;
