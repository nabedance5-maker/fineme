-- ✅ 本番適用済 2026-03-24
-- provider_inquiries に status カラムを追加
alter table provider_inquiries add column if not exists status text default 'new';
