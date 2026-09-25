-- ✅ 本番適用済 2026-09-25
-- でお要望2026-09-25：「自由記述式じゃなくて時間選択する方式で正確に時間の長さが
-- カレンダーに反映されるようにして」。provider_services.durationが自由記述の
-- text型だったため、予約カレンダーの所要時間計算に使えなかった（目安表示のまま）。
-- 数値の分を持つ構造化カラムを追加し、申請制の予約にも紐づけられるようにする。

ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS duration_minutes INT;

-- 既存の自由記述duration（例:「60分」）から数値を抽出できるものは一括バックフィル
-- （店舗側の入力し直しを待たずに、既存メニューもすぐカレンダーで正確表示になる）。
UPDATE provider_services
SET duration_minutes = (regexp_match(duration, '\d+'))[1]::int
WHERE duration_minutes IS NULL AND duration ~ '\d+';

-- 申請制の予約がどのメニューを選んだかを保持するカラム。これまでnote欄に
-- 自由記述で埋め込むだけで、予約カレンダー側からは所要時間を参照できなかった。
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES provider_services(id) ON DELETE SET NULL;
