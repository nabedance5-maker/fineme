-- ✅ 本番適用済 2026-09-18
-- 臨時休業日（でお要望2026-09-18：「特定の1日だけ臨時休業、みたいな例外日の設定も
-- できるようにしたい」）。business_hoursは曜日ごとの固定パターンのみで、不定休
-- （特定の1日だけの休業）を表現できなかった。日付を指定して個別に登録する。
CREATE TABLE IF NOT EXISTS public.provider_closed_dates (
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, date)
);
ALTER TABLE public.provider_closed_dates ENABLE ROW LEVEL SECURITY;
-- service_role（APIルート）からのみ操作するためポリシーは不要
