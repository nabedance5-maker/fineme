-- ✅ 本番適用済 2026-09-13
-- 掲載者ダッシュボードの表示カスタマイズ設定（でお要望2026-09-13）。
-- 起動時に開くタブ・サイドバーのカテゴリー並び順・予約カレンダーの向き（縦/横）・
-- カレンダーの初期表示（スタッフ別/部屋別）は店舗によって好みが分かれるため、
-- 今実装している構成をデフォルトにしつつ店舗ごとに変更できるようにする。
-- 詳細な形は lib/dashboard-prefs.js を単一の真実とする（enabled_featuresと同じ設計方針）。
ALTER TABLE providers ADD COLUMN IF NOT EXISTS dashboard_prefs JSONB DEFAULT '{}'::jsonb;
