-- ✅ 本番適用済 2026-10-01
-- 掲載者ダッシュボード「今日の業務」タブのカスタム編集（でお要望2026-10-01：
-- 「店舗側で何を表示させるかの選択や並び替え、メモを入れるブロックやポップアップで
-- 表示させる選択とか自由度を高めたやつ」）。
-- provider_appeal_blocksと同じ「provider所有・sort_order付きCRUDリスト」の設計を踏襲。
-- こちらは公開ページ向けではなく掲載者本人しか見ない運用画面のため、公開用read APIは作らない。
create table if not exists provider_today_blocks (
  id            uuid primary key default gen_random_uuid(),
  provider_id   uuid not null references providers(id) on delete cascade,
  block_type    text not null check (block_type in ('builtin_reservations','builtin_requests','builtin_checkin','builtin_sales','memo')),
  content       jsonb not null default '{}'::jsonb,
  sort_order    int not null default 0,
  hidden        boolean not null default false,
  display_mode  text not null default 'inline' check (display_mode in ('inline','popup')),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists idx_provider_today_blocks_provider on provider_today_blocks(provider_id, sort_order);

alter table provider_today_blocks enable row level security;
-- 他のprovider_*運用テーブルと同じ方針：公開readポリシーは作らず、service_role
-- （APIルート）のみに絞る。
