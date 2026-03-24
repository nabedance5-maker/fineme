-- providers にカバー（ヒーロー）画像カラムを追加
ALTER TABLE providers ADD COLUMN IF NOT EXISTS cover_image_url text;

-- provider_services に Before/After 画像カラムを追加
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS before_image_url text;
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS after_image_url text;
