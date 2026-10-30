-- ✅ 本番適用済 2026-10-30
-- シフトに開店前の準備・閉店後の片付けの時間を含める（2026-10-30 渡邉要望）。自動作成で、営業時間の前後をこの分だけ広げて作る
-- 予約を受ける時間は営業時間のまま（lib/availability-engine.js）
ALTER TABLE provider_shift_settings ADD COLUMN IF NOT EXISTS prep_before_min SMALLINT NOT NULL DEFAULT 0 CHECK (prep_before_min BETWEEN 0 AND 240);
ALTER TABLE provider_shift_settings ADD COLUMN IF NOT EXISTS cleanup_after_min SMALLINT NOT NULL DEFAULT 0 CHECK (cleanup_after_min BETWEEN 0 AND 240);
