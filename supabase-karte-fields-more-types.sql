-- ✅ 本番適用済 2026-09-12
-- カルテのカスタム項目の自由度を拡張（でお要望2026-09-12：カルテのカスタム性をもっと高めたい）。
-- 従来のtext/select/starsに加えて、number（数値）・date（日付）・checkbox（チェック）を追加。
-- 値の保存先(provider_karte_entries.custom_values jsonb)はtype変更不要、フロント側の
-- 入力欄・表示をtype別に出し分けるだけで対応できる。
ALTER TABLE provider_karte_fields DROP CONSTRAINT IF EXISTS provider_karte_fields_field_type_check;
ALTER TABLE provider_karte_fields
  ADD CONSTRAINT provider_karte_fields_field_type_check
  CHECK (field_type IN ('text', 'select', 'stars', 'number', 'date', 'checkbox'));
