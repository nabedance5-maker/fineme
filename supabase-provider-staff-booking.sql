-- ✅ 本番適用済 2026-09-11
-- スタッフの指名可否・指名料（hacomono/STORES網羅計画 Phase 1）。
-- bookable=false のスタッフは公開予約フォームの指名候補に出さない（例：裏方スタッフ）。

ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS bookable BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS booking_fee INTEGER NOT NULL DEFAULT 0; -- 指名料（円）。0=無料
