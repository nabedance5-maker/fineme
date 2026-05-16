-- profiles テーブルに navi_steps カラムを追加
-- AI生成のパーソナライズされた変容ステップリストを格納する
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS navi_steps JSONB DEFAULT NULL;
