-- ✅ 本番適用済 2026-10-01
-- 店舗公開ページのデザインを店舗ごとにカスタムできるようにする（でお要望 2026-10-01）。
-- テーマ色・地の明るさ・見出し書体・見出し/本文の大きさ・太字・斜体・文字色を JSON で保持する。
-- NULL の店舗は Fineme が決めたデフォルト（lib/provider-theme.js の DEFAULT_THEME）で表示する。
-- 公開ページは get_provider_by_slug（row_to_json(p) = SELECT *）経由で読むため、関数の変更は不要。
ALTER TABLE providers ADD COLUMN IF NOT EXISTS page_theme jsonb;
