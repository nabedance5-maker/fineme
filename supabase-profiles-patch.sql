-- ✅ 本番適用済 2026-03-24
-- profiles テーブルに不足カラムを追加
-- Supabase SQL Editor で実行してください

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS share_diagnosis  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS share_roadmap    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS line_user_id     TEXT;
