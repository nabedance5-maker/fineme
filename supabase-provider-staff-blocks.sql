-- ✅ 本番適用済 2026-09-14
-- スタッフの休憩・外出等による一時的な予約不可時間帯（でお要望2026-09-14：
-- 「スタッフが休憩だったり外出でいない時をブロックできるようにしてほしい」）。
-- シフト管理（provider_shift_entries＝勤務予定そのもの）とは別に、勤務中の
-- 一時的な離席をピンポイントでブロックするための軽量テーブル。
create table if not exists provider_staff_blocks (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  staff_id uuid not null references provider_staff(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_provider_staff_blocks_lookup on provider_staff_blocks(provider_id, staff_id, date);

alter table provider_staff_blocks enable row level security;
-- service_role専用（他のprovider_*運用テーブルと同じ方針）
