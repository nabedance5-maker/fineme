-- ✅ 本番適用済 2026-10-15
-- reservations.booking_mode に 'manual'（店舗がカレンダーや接客メモから直接入れた予約）を許可する。
-- POST /api/provider/reservations/manual は 2026-09-14 から booking_mode='manual' を入れているが、
-- CHECK 制約が request/instant のみだったため、手動予約の作成が常に失敗していた（2026-10-15 発見）。
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_booking_mode_check;
ALTER TABLE reservations ADD CONSTRAINT reservations_booking_mode_check
  CHECK (booking_mode = ANY (ARRAY['request'::text, 'instant'::text, 'manual'::text]));
