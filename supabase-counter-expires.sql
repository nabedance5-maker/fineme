-- ✅ 本番適用済 2026-07-23（適用状況を事後確認。本番で counter_expires_at 列の存在を確認済み）
-- ============================================================
-- 代替提案の回答期限カラムを追加
-- Supabase SQL Editor で新規クエリとして実行してください
-- ============================================================

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS counter_expires_at timestamptz;
