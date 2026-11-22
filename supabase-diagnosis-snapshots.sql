-- ✅ 本番適用済 2026-11-22
-- Me Scan の結果を受け直しのたびに履歴として残す（Muse指示書 2026-11-22 §1-1）
-- diagnosis_results は (user_id, track) ごとに最新1行で上書きされ、過去の結果は端末の
-- localStorage にしか残らなかった（端末を変えると消える）。受け直しごとに1行追記する。
-- 書き込みはサーバー（service role）の /api/me/diagnosis からだけ行う。
create table if not exists diagnosis_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  track       text not null default 'fineme' check (track in ('fineme', 'belle')),
  taken_at    timestamptz not null default now(),   -- 受検日時（raw_data.at）
  raw_data    jsonb not null,
  result      jsonb,                                -- 結果ページで計算したタイプ判定（PATCHで保存）
  created_at  timestamptz not null default now()
);

create index if not exists diagnosis_snapshots_user_track_idx on diagnosis_snapshots (user_id, track, taken_at desc);
-- 同じ受検を二重に保存しない（ログイン時の同期・再送で重複しうるため）
create unique index if not exists diagnosis_snapshots_dedup_idx on diagnosis_snapshots (user_id, track, taken_at);

alter table diagnosis_snapshots enable row level security;
drop policy if exists diagnosis_snapshots_select_own on diagnosis_snapshots;
create policy diagnosis_snapshots_select_own on diagnosis_snapshots
  for select to authenticated using (auth.uid() = user_id);
revoke insert, update, delete on diagnosis_snapshots from anon, authenticated;

-- 既存の最新結果を最初の1件として入れておく（それ以前の履歴はサーバーに無いため復元できない）
insert into diagnosis_snapshots (user_id, track, taken_at, raw_data, result, created_at)
select
  d.user_id,
  coalesce(d.track, 'fineme'),
  case when (d.raw_data->>'at') ~ '^\d{12,14}$' then to_timestamp((d.raw_data->>'at')::bigint / 1000.0)
       when (d.raw_data->>'at') ~ '^\d{4}-\d{2}-\d{2}' then (d.raw_data->>'at')::timestamptz
       else d.created_at end,
  d.raw_data,
  d.result,
  d.created_at
from diagnosis_results d
where d.raw_data is not null
on conflict do nothing;
