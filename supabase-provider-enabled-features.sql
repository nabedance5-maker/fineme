-- ✅ 本番適用済 2026-09-11
-- 店舗ごとの機能ON/OFF基盤（Phase 0）。
-- でお方針（2026-09-11）：「機能は一通り入れておいて、使うかどうかを店舗ごとにカスタマイズ
-- できるようにするのが絶対に必要」——hacomono/STORES網羅計画（今後実装するスタッフ指名予約・
-- POS・チェックイン等）を店舗ごとに要不要が全く違う前提で作るための土台。
-- JSONB 1列にまとめる設計は providers.campaign（supabase-affiliate-campaign.sql）と同じ思想。
-- 詳細: ~/.claude/plans/fineme-1-newme-optimized-hopcroft.md「hacomono/STORES機能網羅計画」

ALTER TABLE providers ADD COLUMN IF NOT EXISTS enabled_features JSONB NOT NULL DEFAULT '{
  "staff_designation": true,
  "resource_management": false,
  "instant_booking": false,
  "pos": false,
  "checkin_qr": false,
  "attendance_confirm": false,
  "payment_mediation": false
}'::jsonb;
