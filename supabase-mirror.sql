-- ✅ 本番適用済 2026-04-15（expires_atなし・永続保存版）
-- New Me Mirror セッションテーブル

CREATE TABLE IF NOT EXISTS mirror_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  analysis jsonb NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text
);

-- 期限切れセッションは自動削除しない（手動 or pg_cron で対応）
-- RLS: サービスロールのみアクセス可（フロントから直接アクセス不可）
ALTER TABLE mirror_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON mirror_sessions
  USING (auth.role() = 'service_role');
