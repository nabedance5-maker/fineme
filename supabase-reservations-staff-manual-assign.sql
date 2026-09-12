-- ✅ 本番適用済 2026-09-12
-- 予約カレンダーから店舗が後付けで担当スタッフを割り当てた予約を区別するためのフラグ
-- （でお要望2026-09-12：指名なし→店舗が割り当てた予約は、担当スタッフの列に出た時に
-- 「お客様がその人を指名した予約」と見分けられるようにしたい）。
-- 予約作成時（お客様の指名・お任せ・即時予約の枠指定）はfalseのまま。
-- PATCH /api/provider/reservations/[id]/assign で店舗がstaff_idを変更した時だけtrueにする。
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS staff_manually_assigned BOOLEAN NOT NULL DEFAULT false;
