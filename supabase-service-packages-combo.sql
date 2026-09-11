-- ✅ 本番適用済 2026-09-11
-- 複合プラン（チケット＋通い放題を1契約で完結）のデータモデル下地（hacomono/STORES網羅計画 Phase 2）。
-- 今野くんの実地メモ：hacomonoの最大の強みは「チケット4回＋通い放題」を1契約で完結できること。
-- STORESは2回契約に分ける必要があり不便。決済実装（Phase 6）より先に、データモデルだけ
-- 先に用意しておく——店舗が今すぐcombo/unlimitedタイプを手動発行で使い始められる。
-- unlimited（通い放題）はセッション数の概念が無いため、total_sessionsをNULL許容にする
-- （combo/fixed_countは従来通りNOT NULL・正の整数のまま）。

ALTER TABLE service_packages
  ADD COLUMN IF NOT EXISTS package_type TEXT NOT NULL DEFAULT 'fixed_count' CHECK (package_type IN ('fixed_count','unlimited','combo'));
ALTER TABLE service_packages
  ADD COLUMN IF NOT EXISTS combo_ticket_sessions INTEGER; -- combo時：通い放題に加えて付くチケット分のセッション数

ALTER TABLE customer_packages
  ADD COLUMN IF NOT EXISTS package_type TEXT NOT NULL DEFAULT 'fixed_count'; -- 発行時点のスナップショット

-- total_sessionsのNOT NULL/CHECK>0を、unlimitedタイプだけ例外にする
ALTER TABLE service_packages ALTER COLUMN total_sessions DROP NOT NULL;
ALTER TABLE service_packages DROP CONSTRAINT IF EXISTS service_packages_total_sessions_check;
ALTER TABLE service_packages
  ADD CONSTRAINT service_packages_total_sessions_check
  CHECK (
    (package_type = 'unlimited' AND total_sessions IS NULL)
    OR (package_type != 'unlimited' AND total_sessions > 0)
  );

ALTER TABLE customer_packages ALTER COLUMN total_sessions DROP NOT NULL;
ALTER TABLE customer_packages DROP CONSTRAINT IF EXISTS customer_packages_total_sessions_check;
ALTER TABLE customer_packages
  ADD CONSTRAINT customer_packages_total_sessions_check
  CHECK (
    (package_type = 'unlimited' AND total_sessions IS NULL)
    OR (package_type != 'unlimited' AND total_sessions > 0)
  );
