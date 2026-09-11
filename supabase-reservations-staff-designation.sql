-- ✅ 本番適用済 2026-09-11
-- スタッフ指名予約・即時予約モード（hacomono/STORES網羅計画 Phase 1）。
-- 全カラムnullable/デフォルト値付き＝既存の申請制フロー（booking_mode省略時）は無変更。
-- 詳細: ~/.claude/plans/fineme-1-newme-optimized-hopcroft.md「hacomono/STORES機能網羅計画」

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES provider_staff(id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS designation_fee INTEGER NOT NULL DEFAULT 0; -- 指名料スナップショット（予約時点のprovider_staff.booking_feeをコピー）
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS booking_mode TEXT NOT NULL DEFAULT 'request' CHECK (booking_mode IN ('request','instant'));
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS slot_id UUID; -- instant予約モードのみ使用。provider_slotsへのFKは下のALTERで追加
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS resource_id UUID; -- 部屋/設備。provider_resourcesへのFKは別ファイルで追加
