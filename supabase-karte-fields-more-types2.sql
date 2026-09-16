-- ✅ 本番適用済 2026-09-16
-- カルテ項目の種類をさらに拡張（でお要望2026-09-16：「カルテ項目の追加でもっと
-- いろんな機能をつけてほしい。10個ぐらいあっていい」）。既存6種（text/select/stars/
-- number/date/checkbox）に加えて、multiselect（複数選択）・url（リンク）・
-- time（時刻）・rating10（10段階評価）を追加し、合計10種類にする。
ALTER TABLE provider_karte_fields DROP CONSTRAINT IF EXISTS provider_karte_fields_field_type_check;
ALTER TABLE provider_karte_fields
  ADD CONSTRAINT provider_karte_fields_field_type_check
  CHECK (field_type IN ('text', 'select', 'stars', 'number', 'date', 'checkbox', 'multiselect', 'url', 'time', 'rating10'));
