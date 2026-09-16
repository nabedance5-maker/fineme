-- ✅ 本番適用済 2026-09-16
-- クラス管理に金額を追加（でお要望2026-09-16：「クラス管理のところに金額、
-- 残りの参加人数追加できる？」）。残りの参加人数はcapacity-enrolledCountで
-- 既存データから計算できるため、DB追加が必要なのは金額のみ。
ALTER TABLE public.provider_classes ADD COLUMN IF NOT EXISTS price INT;
