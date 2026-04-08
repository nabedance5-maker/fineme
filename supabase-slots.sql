-- provider_slots: 掲載者の空き枠管理テーブル
-- Supabase SQL Editor で実行してください

CREATE TABLE IF NOT EXISTS public.provider_slots (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id   UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  service_id    UUID,                        -- provider_services.id（NULL = 全サービス対応）
  date          DATE NOT NULL,               -- 日付 YYYY-MM-DD
  start_time    TEXT NOT NULL,               -- 開始時刻 HH:MM
  end_time      TEXT NOT NULL,               -- 終了時刻 HH:MM
  capacity      INTEGER NOT NULL DEFAULT 1, -- 定員（同時受付可能人数）
  is_open       BOOLEAN NOT NULL DEFAULT true, -- true=受付中 / false=締切
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.provider_slots ENABLE ROW LEVEL SECURITY;
-- service_role（APIルート）からのみ操作するためポリシーは不要

CREATE INDEX IF NOT EXISTS idx_slots_provider_date
  ON public.provider_slots(provider_id, date);
