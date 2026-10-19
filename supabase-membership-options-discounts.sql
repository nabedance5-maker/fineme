-- ✅ 本番適用済 2026-10-19
-- 会員プランのオプション・割引・クーポン（でお要望 2026-10-19：hacomono差分 #5）。
-- オプション：プランに足す月額の追加サービス（例：タオル・水素水・プロテイン飲み放題）。同じサブスクの明細として一緒に課金。
-- 割引：月会費から引く値引き（金額 or ％、初月だけ／◯か月／ずっと）。店舗が会員に付けるか、
--       「クーポンコード」を設定しておけば、お客様が入会時にコードを入れて使える（＝クーポン）。

create table if not exists provider_membership_options (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  monthly_price int not null check (monthly_price > 0),
  description text,
  active boolean not null default true,
  sort_order int not null default 0,
  stripe_product_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_provider_membership_options_p on provider_membership_options(provider_id, sort_order);

-- 会員ごとに付いているオプション（Stripeのサブスクの明細と1対1）
create table if not exists provider_membership_option_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  membership_id uuid not null references provider_memberships(id) on delete cascade,
  option_id uuid references provider_membership_options(id) on delete set null,
  name text not null,              -- 付けた時点の名前と金額（店舗が後で変えても既存の契約は変わらない）
  monthly_price int not null,
  stripe_item_id text,
  status text not null default 'active' check (status in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists idx_provider_membership_option_items_m on provider_membership_option_items(membership_id, status);

create table if not exists provider_membership_discounts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('amount', 'percent')),
  value int not null check (value > 0),
  duration text not null default 'once' check (duration in ('once', 'repeating', 'forever')),
  months int,                      -- duration='repeating' のときの月数
  code text,                       -- クーポンコード（空ならクーポンとしては使えず、店舗が付ける割引だけ）
  max_uses int,                    -- クーポンの利用上限（空なら無制限）
  used_count int not null default 0,
  valid_until date,                -- クーポンの有効期限（この日まで）
  active boolean not null default true,
  stripe_coupon_id text,
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100),
  check (duration <> 'repeating' or (months is not null and months between 1 and 36))
);
create unique index if not exists uq_provider_membership_discounts_code on provider_membership_discounts(provider_id, lower(code)) where code is not null;

alter table provider_memberships add column if not exists option_ids uuid[];        -- 入会時に選んだオプション（承認時に明細化）
alter table provider_memberships add column if not exists discount_id uuid references provider_membership_discounts(id) on delete set null;
alter table provider_memberships add column if not exists discount_applied_at timestamptz;

-- 変更の履歴にオプション・割引の付け外しも残す
alter table provider_membership_changes drop constraint if exists provider_membership_changes_kind_check;
alter table provider_membership_changes add constraint provider_membership_changes_kind_check
  check (kind in ('pause', 'resume', 'plan_change', 'cancel', 'cancel_undo', 'option_add', 'option_remove', 'discount_apply', 'discount_remove'));
alter table provider_membership_changes add column if not exists detail text;   -- 「タオル（月額¥500）」など表示用

alter table provider_membership_options enable row level security;
alter table provider_membership_option_items enable row level security;
alter table provider_membership_discounts enable row level security;
-- service_role専用（他のprovider_*運用テーブルと同じ方針）
