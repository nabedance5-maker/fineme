-- ✅ 本番適用済 2026-10-23
-- 店舗SaaSの営業メール（新規開拓）の送信先と送信記録。
-- 1行＝1つのメールアドレス。email の unique で二重送信を防ぎ、配信停止したアドレスには二度と送らない。
create table if not exists sales_outreach (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  shop_name text not null,
  category text not null check (category in ('gym', 'brow')),
  area text,
  rank text,
  website text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'unsubscribed', 'replied', 'skipped')),
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  sent_at timestamptz,
  message_id text,
  error text,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_sales_outreach_status on sales_outreach(status, rank);
alter table sales_outreach enable row level security;
