-- diagnosis_results テーブル作成
-- Me Scan の診断データを保存する（ユーザー1人につき1行）

create table if not exists public.diagnosis_results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  raw_data    jsonb,
  scores      jsonb,
  result      jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id)
);

-- RLS有効化
alter table public.diagnosis_results enable row level security;

-- 自分のデータのみ読み書き可能
create policy "自分の診断データを読める" on public.diagnosis_results
  for select using (auth.uid() = user_id);

create policy "自分の診断データを書ける" on public.diagnosis_results
  for insert with check (auth.uid() = user_id);

create policy "自分の診断データを更新できる" on public.diagnosis_results
  for update using (auth.uid() = user_id);

-- updated_at 自動更新
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger diagnosis_results_updated_at
  before update on public.diagnosis_results
  for each row execute function public.set_updated_at();
