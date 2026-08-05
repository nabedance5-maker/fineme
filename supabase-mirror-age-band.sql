-- ⏳ 未適用（オーナーが本番Supabaseで実行してください）
-- New Me Mirror: 分析対象の年代（10s/20s/30s/40s/50s_plus）を記録するカラム。
-- app/api/mirror/analyze/route.js が insert 時に age_band を書き込む。
-- 未適用でも analyze は後方互換フォールバックで動作するが、age_band は保存されない。

ALTER TABLE mirror_sessions ADD COLUMN IF NOT EXISTS age_band text;
