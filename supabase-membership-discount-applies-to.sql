-- ✅ 本番適用済 2026-11-09
-- 割引・クーポンを入会金にも使えるように（2026-11-09 渡邉要望：「クーポンが月額費から引く設定になってるけど、入会金の割引もできるようにしてほしい」）。
-- applies_to：monthly＝月会費から引く（これまでどおり）／initial_fee＝入会金から引く（入会時の1回だけ）
alter table provider_membership_discounts add column if not exists applies_to text not null default 'monthly';
alter table provider_membership_discounts drop constraint if exists provider_membership_discounts_applies_to_check;
alter table provider_membership_discounts add constraint provider_membership_discounts_applies_to_check check (applies_to in ('monthly', 'initial_fee'));
