-- ✅ 本番適用済 2026-04-05
-- Stripe Connect カラム追加
-- providers テーブルに Stripe Connect アカウントIDとステータスを追加

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'none';

-- インデックス（Connect IDで検索できるように）
CREATE INDEX IF NOT EXISTS idx_providers_stripe_connect_id ON providers(stripe_connect_id);
