-- provider_services テーブルに画像URLカラムを追加
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS image_url text;
