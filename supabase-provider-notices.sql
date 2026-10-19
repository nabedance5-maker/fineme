-- ✅ 本番適用済 2026-10-19
-- お知らせ掲示（でお要望 2026-10-19：hacomono差分 #13）。
-- 店舗がお知らせを書くと、その店舗のお客様のマイページ「お店からのお知らせ」に並ぶ。既読も数える。
create table if not exists provider_notices (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all', 'members')),  -- all=お客様全員 / members=会員プランに入会中の方
  pinned boolean not null default false,
  publish_at timestamptz not null default now(),   -- この時刻から表示（予約掲載）
  expires_at timestamptz,                           -- この時刻で表示を終える（空なら終わらない）
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_provider_notices_p on provider_notices(provider_id, publish_at desc);

create table if not exists provider_notice_reads (
  notice_id uuid not null references provider_notices(id) on delete cascade,
  user_id uuid not null,
  read_at timestamptz not null default now(),
  primary key (notice_id, user_id)
);

alter table provider_notices enable row level security;
alter table provider_notice_reads enable row level security;
-- service_role専用（お客様側もAPI経由）
