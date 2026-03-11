-- ============================================================
-- reservations テーブル修正
-- Supabase ダッシュボード > SQL Editor で実行してください
-- ============================================================

-- ① 不足カラムを追加
alter table public.reservations
  add column if not exists user_name     text,
  add column if not exists user_contact  text,
  add column if not exists preferred_date date,
  add column if not exists preferred_time text,
  add column if not exists message       text;

-- ② RLS: 誰でも予約リクエストを作成できるようにする（非ログインユーザーも可）
drop policy if exists "自分の予約のみ作成" on public.reservations;

create policy "予約リクエストは誰でも作成可能"
  on public.reservations for insert
  with check (true);

-- ③ RLS: 掲載者は自分宛の予約を閲覧できる（service_roleでバイパス済みだが念のため）
-- ※ 運営・掲載者ダッシュボードは service_role キーを使うためRLS不要
