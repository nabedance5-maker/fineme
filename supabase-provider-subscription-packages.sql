-- ✅ 本番適用済 2026-09-14
-- 月額会員への自動チケット付与（でお要望2026-09-14：「店舗によっては月額を契約する
-- ことで毎月チケットが付与される仕組みのところもある」）。既存の回数券
-- （service_packages/customer_packages）にpackage_type='subscription'を追加する形で
-- 対応。決済は引き続き仲介しない（店舗が店頭で月額徴収→Finemeは毎月の自動付与のみ）。

alter table service_packages drop constraint if exists service_packages_package_type_check;
alter table service_packages add constraint service_packages_package_type_check
  check (package_type = any (array['fixed_count', 'unlimited', 'combo', 'subscription']));

-- サブスクリプション型パッケージの「1サイクルあたりの付与回数」（total_sessionsは初回付与分として流用）
alter table service_packages add column if not exists recurring_sessions int;

-- 会員側の契約ステータス・次回付与予定日
alter table customer_packages add column if not exists subscription_status text check (subscription_status in ('active', 'cancelled'));
alter table customer_packages add column if not exists next_grant_at date;

-- 毎月の自動付与ログ（重複付与防止・履歴確認用）
create table if not exists customer_package_grants (
  id uuid primary key default gen_random_uuid(),
  customer_package_id uuid not null references customer_packages(id) on delete cascade,
  granted_at timestamptz not null default now(),
  sessions_added int not null
);
create index if not exists idx_customer_package_grants_pkg on customer_package_grants(customer_package_id);

alter table customer_package_grants enable row level security;
-- service_role専用（他のprovider_*運用テーブルと同じ方針）
