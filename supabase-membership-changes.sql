-- ✅ 本番適用済 2026-10-19
-- 会員プランの休会・プラン変更・退会（でお要望 2026-10-19：hacomono差分 #4）。
-- 休会・退会予約は provider_memberships.status を 'active' のまま、別カラムで表す
-- （status='active' を前提にしている既存の顧客一覧・請求・顧客情報の表示を壊さないため）。
-- 実際にサブスクが終わった時だけ status='cancelled' になる（Stripeのwebhookまたは即時退会）。

alter table provider_memberships add column if not exists paused_at timestamptz;      -- 休会中なら開始日時
alter table provider_memberships add column if not exists pause_until date;           -- 休会の終了（再開）予定日。null=未定
alter table provider_memberships add column if not exists cancel_at date;             -- 退会予定日（その日で終了）
alter table provider_memberships add column if not exists cancelled_at timestamptz;   -- 実際に退会した日時
alter table provider_memberships add column if not exists cancel_reason text;

-- お客様がマイページから休会・プラン変更・退会を申請できるか（店舗ごと）
alter table provider_membership_settings add column if not exists allow_online_requests boolean not null default true;

-- 変更の履歴と、お客様からの申請（status='requested'）を同じ台帳で持つ
create table if not exists provider_membership_changes (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  membership_id uuid not null references provider_memberships(id) on delete cascade,
  kind text not null check (kind in ('pause', 'resume', 'plan_change', 'cancel', 'cancel_undo')),
  status text not null default 'applied' check (status in ('requested', 'applied', 'declined', 'withdrawn')),
  from_plan_id uuid references provider_membership_plans(id) on delete set null,
  to_plan_id uuid references provider_membership_plans(id) on delete set null,
  timing text,             -- now / period_end / date
  effective_date date,     -- 退会日・プラン変更日など
  pause_until date,
  reason text,             -- お客様または店舗が書いた理由
  store_note text,         -- お断りの理由など店舗の記録
  requested_by text not null default 'store' check (requested_by in ('store', 'customer')),
  operator text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists idx_provider_membership_changes_m on provider_membership_changes(membership_id, created_at desc);
create index if not exists idx_provider_membership_changes_req on provider_membership_changes(provider_id, status);
alter table provider_membership_changes enable row level security;
-- service_role専用（他のprovider_*運用テーブルと同じ方針）
