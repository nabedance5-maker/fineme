-- profiles テーブルに line_user_id カラムを追加（ユーザー側LINE連携用）
-- Supabase SQL Editor で実行してください

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_user_id text;
