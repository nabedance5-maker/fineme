-- ✅ 本番適用済 2026-10-03
-- 操作ログにお客様側の操作を記録するための列を追加する
-- actor: 'store'（店舗が画面で行った操作）/ 'customer'（お客様が店舗に対して行った操作）
ALTER TABLE provider_activity_logs
  ADD COLUMN IF NOT EXISTS actor TEXT NOT NULL DEFAULT 'store',
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_user_id UUID;

ALTER TABLE provider_activity_logs
  DROP CONSTRAINT IF EXISTS provider_activity_logs_actor_check;
ALTER TABLE provider_activity_logs
  ADD CONSTRAINT provider_activity_logs_actor_check CHECK (actor IN ('store', 'customer'));

CREATE INDEX IF NOT EXISTS idx_provider_activity_logs_actor
  ON provider_activity_logs (provider_id, actor, occurred_at DESC);

-- お客様の操作はAPIルートに紐づかない場合（LINEの返信など）があるため、method / route_key は必須にしない
ALTER TABLE provider_activity_logs ALTER COLUMN method DROP NOT NULL;
ALTER TABLE provider_activity_logs ALTER COLUMN route_key DROP NOT NULL;
