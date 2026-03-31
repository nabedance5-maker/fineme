-- featuresテーブルに body_images カラムを追加
-- 本文内に表示する画像URLの配列を格納する
ALTER TABLE features ADD COLUMN IF NOT EXISTS body_images JSONB DEFAULT '[]';
