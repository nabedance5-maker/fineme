-- ============================================================
-- 代替提案の回答期限カラムを追加
-- Supabase SQL Editor で新規クエリとして実行してください
-- ============================================================

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS counter_expires_at timestamptz;
