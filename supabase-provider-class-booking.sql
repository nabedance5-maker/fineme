-- ✅ 本番適用済 2026-09-16
-- クラス管理（provider_classes）は名簿・進級管理のみで、実際にお客様が特定の回に
-- 予約できる仕組みが無かった（でお指摘2026-09-16：「予約できる仕組みがまだない。
-- 店舗側は予約カレンダーに入れられるようにしなきゃいけないし、お客さん側にはその
-- 店舗のページに予約枠が出てこないと無意味」）。
-- 既存の即時予約基盤（provider_slots + reservations.booking_mode='instant'）を
-- そのまま再利用する：クラスの1回分の開催＝provider_slotsの1行（class_id付き）。
-- 予約時の空き枠再検証・満席チェック・確定処理は/api/reservationsの既存コードパスを
-- 完全に流用でき、新しい予約エンドポイントは不要。

ALTER TABLE public.provider_slots ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.provider_classes(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_provider_slots_class ON public.provider_slots(class_id) WHERE class_id IS NOT NULL;

-- 予約側にもスナップショットとして残す（枠が後から削除されても、どのクラスの予約
-- だったかが分かるように。他のスナップショット列＝designation_feeと同じ考え方）。
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.provider_classes(id) ON DELETE SET NULL;
