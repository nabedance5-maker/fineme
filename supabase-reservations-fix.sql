-- ============================================================
-- reservations テーブル修正（supabase-reservations-fix.sql）
-- Supabase ダッシュボード > SQL Editor で実行してください
-- ============================================================

-- ① 前回誤って追加したカラムを削除（存在する場合のみ）
alter table public.reservations
  drop column if exists preferred_date,
  drop column if exists preferred_time,
  drop column if exists message;

-- ② RLS: 未ログインユーザーも予約リクエストを作成できるようにする
-- （v2スキーマのポリシーは auth.uid() = user_id が必須 → 未ログインで失敗するため差し替え）
drop policy if exists "自分の予約のみ作成" on public.reservations;
drop policy if exists "予約を作成" on public.reservations;
drop policy if exists "予約リクエストは誰でも作成可能" on public.reservations;

create policy "予約リクエストは誰でも作成可能"
  on public.reservations for insert
  with check (true);
