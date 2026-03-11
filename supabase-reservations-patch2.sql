-- ============================================================
-- reservations テーブル追加パッチ（supabase-reservations-patch2.sql）
-- Supabase SQL Editor で新規クエリとして実行してください
-- ============================================================

-- ① 不足カラムを追加
alter table public.reservations
  add column if not exists provider_comment   text    default '',
  add column if not exists counter_date       date,
  add column if not exists counter_time       text,
  add column if not exists confirmed_date     date,
  add column if not exists confirmed_time     text;

-- ② reserved_date / start_time の NOT NULL 制約を緩和（既存レコード保護）
alter table public.reservations
  alter column reserved_date drop not null,
  alter column start_time    drop not null;

-- ③ UPDATE RLS: 全許可（service_role でバイパスされるが念のため）
drop policy if exists "自分の予約のみ更新"         on public.reservations;
drop policy if exists "自分の予約を更新（キャンセル等）" on public.reservations;
drop policy if exists "予約ステータスを誰でも更新可能"  on public.reservations;

create policy "予約ステータスを誰でも更新可能"
  on public.reservations for update
  using (true)
  with check (true);
