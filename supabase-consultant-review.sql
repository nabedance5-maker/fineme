-- ✅ 本番適用済 2026-11-13
-- AIによる導入設定の定期の見直し（2026-11-13 渡邉要望：オンボーディングを最初だけでなく定期的にAIが見直して振り返る。
-- 間隔はお店が選べ、既定は3か月）
alter table provider_consultant_settings add column if not exists review_interval_months integer not null default 3;
alter table provider_consultant_settings add column if not exists next_review_at timestamptz;
do $$ begin
  alter table provider_consultant_settings add constraint provider_consultant_settings_review_interval_chk check (review_interval_months in (1, 3, 6, 12));
exception when duplicate_object then null; end $$;

create table if not exists provider_consultant_reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  created_at timestamptz not null default now(),
  period_from date,
  period_to date,
  content jsonb not null default '{}'::jsonb
);
create index if not exists provider_consultant_reviews_provider on provider_consultant_reviews(provider_id, created_at desc);
alter table provider_consultant_reviews enable row level security;
revoke all on provider_consultant_reviews from anon, authenticated;
