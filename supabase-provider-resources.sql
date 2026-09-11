-- ✅ 本番適用済 2026-09-11
-- 部屋・設備（リソース）管理（hacomono/STORES網羅計画 Phase 1）。
-- 今野くんの実地メモ：スタッフだけブロックして部屋のブロックを忘れダブルブッキングが
-- 起きていた、という具体的な運用課題への対応。provider_staffとは別テーブルにして
-- スタッフ選択と部屋選択を独立に管理できるようにする。

CREATE TABLE IF NOT EXISTS public.provider_resources (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id   UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,           -- 例: "個室A", "マシン1"
  type          TEXT DEFAULT 'room',     -- room / equipment / other
  active        BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.provider_resources ENABLE ROW LEVEL SECURITY;
-- service_role（APIルート）からのみ操作するためポリシーは不要

CREATE INDEX IF NOT EXISTS idx_provider_resources_provider ON public.provider_resources(provider_id);

-- reservations/provider_slots からリソース・枠への参照を今ここでFK化する
-- （supabase-reservations-staff-designation.sql / supabase-slots.sql は先に適用されている前提）
-- PostgresはADD CONSTRAINT IF NOT EXISTSを持たないため、DOブロックで存在確認してから追加する
-- （再実行しても安全にするため）。
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_resource_id_fkey') THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_resource_id_fkey
      FOREIGN KEY (resource_id) REFERENCES public.provider_resources(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.provider_slots ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES public.provider_staff(id) ON DELETE SET NULL;
ALTER TABLE public.provider_slots ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES public.provider_resources(id) ON DELETE SET NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reservations_slot_id_fkey') THEN
    ALTER TABLE public.reservations
      ADD CONSTRAINT reservations_slot_id_fkey
      FOREIGN KEY (slot_id) REFERENCES public.provider_slots(id) ON DELETE SET NULL;
  END IF;
END $$;
