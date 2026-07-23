-- ⚠️ 本番Supabase（SQL Editor）で実行してから、この行の下に「✅ 本番適用済 YYYY-MM-DD」を追記すること。
-- New Me Mirror: 分析対象の性別（male / female / null）を記録するカラム。
-- app/api/mirror/analyze/route.js が insert 時に gender を書き込む。
-- 未適用でも analyze は後方互換フォールバックで動作するが、gender は保存されない。

ALTER TABLE mirror_sessions ADD COLUMN IF NOT EXISTS gender text;
