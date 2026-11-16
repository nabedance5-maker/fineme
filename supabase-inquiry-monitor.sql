-- ✅ 本番適用済 2026-11-16
-- 無料モニターの応募を掲載相談フォーム（provider_inquiries）で受ける（2026-11-16）
-- Googleフォームでは紹介コードが引き継げず、営業パートナーの紹介報酬が紐づかないため。
-- desired_plan に 'monitor'（無料モニターに応募）を足す。
alter table provider_inquiries drop constraint if exists provider_inquiries_desired_plan_check;
alter table provider_inquiries add constraint provider_inquiries_desired_plan_check
  check (desired_plan = any (array['A','B','C','monitor']));
