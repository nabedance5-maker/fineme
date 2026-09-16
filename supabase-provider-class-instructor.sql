-- ✅ 本番適用済 2026-09-16
-- グループレッスンの担当講師（でお要望2026-09-16：「一覧には講師の顔写真を
-- つけて」）。クラス1件につき1名の主担当講師を紐付ける（開催回ごとのstaff_idは
-- Phase 1で既に存在するが、それとは別に「このクラスは基本的に誰が教えるか」を
-- クラス定義側に持たせる）。

ALTER TABLE public.provider_classes ADD COLUMN IF NOT EXISTS instructor_staff_id UUID REFERENCES public.provider_staff(id) ON DELETE SET NULL;
