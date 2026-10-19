-- ✅ 本番適用済 2026-10-20
-- メニューごとの「予約できる人」（でお要望 2026-10-20）。
-- 誰でも予約できるメニューと、回数券を持っている人・会員プランに入会中の人だけが予約できるメニューを分ける。
-- booking_scope='limited' のとき、allow_ticket / allow_membership のどちらかを満たす人だけ予約できる。
alter table provider_services add column if not exists booking_scope text not null default 'public';
alter table provider_services drop constraint if exists provider_services_booking_scope_check;
alter table provider_services add constraint provider_services_booking_scope_check check (booking_scope in ('public', 'limited'));
alter table provider_services add column if not exists allow_ticket boolean not null default false;      -- 回数券を持っている人
alter table provider_services add column if not exists eligible_package_ids uuid[] not null default '{}'; -- 対象の回数券の種類（空＝この店のどの回数券でも）
alter table provider_services add column if not exists allow_membership boolean not null default false;  -- 会員プランに入会中の人
alter table provider_services add column if not exists eligible_plan_ids uuid[] not null default '{}';    -- 対象の会員プラン（空＝どのプランでも）
alter table provider_services add column if not exists hide_when_locked boolean not null default false;  -- 予約できない人には表示しない（既定は「◯◯の方専用」と表示）
