-- ✅ 本番適用済 2026-11-16
-- Stripe の通知（イベント）を処理した記録（2026-11-16）
-- 同じイベントを2回処理しないためと、取りこぼした通知を /api/cron/stripe-reconcile が拾い直すための目印。
-- サーバー（service role）だけが読み書きする。anon / authenticated には何も許可しない。
create table if not exists public.stripe_webhook_events (
  id text primary key,                 -- Stripe のイベントID（evt_...）
  type text not null,
  event_created_at timestamptz,
  source text not null default 'webhook', -- webhook | reconcile
  processed_at timestamptz not null default now()
);
create index if not exists stripe_webhook_events_created_idx on public.stripe_webhook_events (event_created_at);
alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from anon, authenticated;
