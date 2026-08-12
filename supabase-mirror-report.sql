-- ✅ 本番適用済 2026-08-12
-- Mirror ビジュアルレポート: アップロード写真の保存 + Claude Haikuによるリッチ分析結果保存
-- app/api/mirror/analyze/route.js が photo_path 保存に使用（写真はStorageバケット mirror-photos へ）。
-- app/api/mirror/report/route.js が report_status/report_content/report_error の読み書きに使用。
-- 未適用でも analyze は後方互換フォールバックで動作するが、写真は保存されずレポート生成は使えない。
--
-- 手動アクションアイテム（本ファイルとは別途、実装者が対応）:
--   1. Supabaseダッシュボードで Storage バケット `mirror-photos` を作成（Private, 10MB上限, image/jpeg・image/png・image/webp許可）
--   2. 本SQLを本番Supabaseで実行後、このファイル先頭に `-- ✅ 本番適用済 YYYY-MM-DD` を追記してコミット

ALTER TABLE mirror_sessions
  ADD COLUMN IF NOT EXISTS photo_path     TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS report_status  TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS report_content JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS report_error   TEXT DEFAULT NULL;

ALTER TABLE mirror_sessions
  DROP CONSTRAINT IF EXISTS mirror_sessions_report_status_check;

ALTER TABLE mirror_sessions
  ADD CONSTRAINT mirror_sessions_report_status_check
  CHECK (report_status IN ('none', 'ready', 'failed'));
