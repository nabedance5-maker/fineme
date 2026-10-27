-- ✅ 本番適用済 2026-10-27
-- 月会費のクーポン（割引）を Fineme が計算して請求書に入れ、請求額がレシートと必ずそろうように照合する（でお指摘 2026-10-27：
-- 「クーポンの請求とレシートは絶対にずれてはいけない」）。Stripe のクーポン機能は使わない（回数の数え方・掛かる明細が Fineme の説明と違うため）。
alter table provider_memberships add column if not exists discount_managed boolean not null default false; -- Fineme が割引の明細を入れる会員か（false＝以前の Stripe クーポン）
alter table provider_memberships add column if not exists discount_remaining int;          -- 割引の残り回数（承認後の定期の請求で数える。null＝ずっと）
alter table provider_memberships add column if not exists discount_pending_item_id text;   -- 次の請求に入れる割引の明細（Stripe invoice item）
alter table provider_memberships add column if not exists billing_expected jsonb;          -- 次の請求の見込み（見積もりで点検した額）{ total, discount, checked_at }
alter table provider_memberships add column if not exists approval_receipt jsonb;          -- 承認した時にお客様に見せたレシート

-- 割引を使った請求（同じ請求書で2回数えないため）
create table if not exists provider_membership_discount_uses (
  stripe_invoice_id text primary key,
  membership_id uuid not null references provider_memberships(id) on delete cascade,
  provider_id uuid not null references providers(id) on delete cascade,
  amount int not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_pm_discount_uses_m on provider_membership_discount_uses(membership_id);

-- 請求額の照合で食い違いを見つけた記録（運営と店舗に知らせる）
create table if not exists provider_membership_billing_alerts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references providers(id) on delete cascade,
  membership_id uuid references provider_memberships(id) on delete cascade,
  stripe_invoice_id text,
  kind text not null,               -- approval_blocked（承認を止めた）| upcoming（次回の見積もり）| paid（実際の請求）
  problems jsonb not null default '[]'::jsonb,
  expected int,
  actual int,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_pm_billing_alerts_p on provider_membership_billing_alerts(provider_id, created_at desc);

alter table provider_membership_discount_uses enable row level security;
alter table provider_membership_billing_alerts enable row level security;
-- service_role専用（他のprovider_*運用テーブルと同じ方針）
