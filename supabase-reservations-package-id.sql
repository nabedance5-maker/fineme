-- ✅ 本番適用済 2026-09-27
-- でお要望2026-09-27：予約時にどのチケット（回数券）を使うかお客様が選べるようにし、
-- 来店確認時の自動チケット消化を「複数ある時は自動判定しない」から「予約時の選択を
-- 優先消化」に強化する。実際の来店内容が変わった場合に備え、店舗側で来店後に
-- 使用チケットを変更できる仕組みも別途用意する（package_usagesのundone_atを使った
-- 取り消し＋作り直し）。
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES customer_packages(id) ON DELETE SET NULL;
