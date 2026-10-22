-- ✅ 本番適用済 2026-10-22
-- 公開ページに何を出すかを店舗が選べるようにする（でお要望 2026-10-22）。
-- キー＝出し分けできる項目、値 false＝出さない。キーが無い項目は従来通り出す（既存店舗の見え方は変わらない）。
-- 例：{"tab_appeal": false, "basic_payment": false}
ALTER TABLE providers ADD COLUMN IF NOT EXISTS page_visibility JSONB NOT NULL DEFAULT '{}'::jsonb;
