-- ✅ 本番適用済 2026-10-30
-- シフトの自動確定（2026-10-30 渡邉要望：未確定のまま当日・週・月を迎えないよう、◯日前になったら自動で確定）
-- auto_confirm_days_before：その日の何日前になったら確定するか（NULL＝しない）
-- auto_generate_before_confirm：確定する時、まだシフトが1つも無い日は先に自動で作る
ALTER TABLE provider_shift_settings ADD COLUMN IF NOT EXISTS auto_confirm_days_before SMALLINT CHECK (auto_confirm_days_before BETWEEN 1 AND 60);
ALTER TABLE provider_shift_settings ADD COLUMN IF NOT EXISTS auto_generate_before_confirm BOOLEAN NOT NULL DEFAULT true;
