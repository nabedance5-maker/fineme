-- ✅ 本番適用済 2026-10-19
-- メンバータイプ・タグ・保存した絞り込み（でお要望 2026-10-19：hacomono差分 #7）。
-- メンバータイプ：お客様1人に1つ（例：一般・法人・学生・スタッフ家族）。タグ：何個でも（例：腰痛あり・紹介者・VIP）。
-- 保存した絞り込み：顧客一覧の絞り込み条件に名前を付けて保存し、一覧とメッセージ配信の「送る相手」で使う。

create table if not exists provider_member_types (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_provider_member_types_p on provider_member_types(provider_id, sort_order);

create table if not exists provider_customer_tags (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_provider_customer_tags_name on provider_customer_tags(provider_id, lower(name));

-- お客様ごとのタイプとタグ。会員（user_id）か非会員（manual_id）のどちらか
create table if not exists provider_customer_labels (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  user_id uuid,
  manual_id uuid references provider_manual_customers(id) on delete cascade,
  member_type_id uuid references provider_member_types(id) on delete set null,
  tag_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  check ((user_id is null) <> (manual_id is null))
);
create unique index if not exists uq_provider_customer_labels_user on provider_customer_labels(provider_id, user_id) where user_id is not null;
create unique index if not exists uq_provider_customer_labels_manual on provider_customer_labels(provider_id, manual_id) where manual_id is not null;

create table if not exists provider_customer_segments (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_provider_customer_segments_p on provider_customer_segments(provider_id, created_at);

alter table provider_member_types enable row level security;
alter table provider_customer_tags enable row level security;
alter table provider_customer_labels enable row level security;
alter table provider_customer_segments enable row level security;
-- service_role専用（他のprovider_*運用テーブルと同じ方針）
