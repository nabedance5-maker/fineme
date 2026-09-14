-- ✅ 本番適用済 2026-09-14
-- ロッカー月極契約管理（でお要望2026-09-14：hacomonoにあるロッカー機能。
-- お客様が店舗のロッカーを月極で契約できるやつ）。決済は仲介せず、店舗が
-- 契約状況を記録・管理するだけ（既存のservice_packages/customer_packagesと同じ方針）。

-- ロッカー本体（番号・名称・月額）
create table if not exists provider_lockers (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  monthly_fee numeric,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_provider_lockers_provider on provider_lockers(provider_id, sort_order);

-- 契約（1ロッカーにつき、有効な契約は同時に1件まで＝物理的な資源として扱う）
create table if not exists provider_locker_contracts (
  id uuid primary key default gen_random_uuid(),
  locker_id uuid not null references provider_lockers(id) on delete cascade,
  provider_id uuid not null references providers(id) on delete cascade,
  user_id uuid, -- Fineme会員なら紐付け可、非会員はnullのままcontractor_nameのみで管理
  contractor_name text not null,
  monthly_fee numeric, -- 契約時点の月額スナップショット（後から店舗が料金を変えても過去契約には影響しない）
  status text not null default 'active' check (status in ('active', 'cancelled')),
  started_at timestamptz not null default now(),
  cancelled_at timestamptz,
  note text
);
create index if not exists idx_provider_locker_contracts_locker on provider_locker_contracts(locker_id, status);

alter table provider_lockers enable row level security;
alter table provider_locker_contracts enable row level security;
-- service_role専用（他のprovider_*運用テーブルと同じ方針）
