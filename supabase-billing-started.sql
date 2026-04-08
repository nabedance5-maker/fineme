-- providers テーブルに billing_started カラム追加（初回来店日時）
-- billing/referrals API で TIMESTAMPTZ として月数計算に使用
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS billing_started TIMESTAMPTZ;

-- 既存データ対応：billing_started が BOOLEAN TRUE になっている可能性があるため
-- 本番適用前に確認。もし型エラーが出た場合は以下を先に実行：
-- ALTER TABLE public.providers DROP COLUMN IF EXISTS billing_started;
-- その後このファイルを再実行

-- reserved_date + start_time で24時間経過チェック用インデックス
CREATE INDEX IF NOT EXISTS idx_reservations_status_date
  ON public.reservations(status, reserved_date);
