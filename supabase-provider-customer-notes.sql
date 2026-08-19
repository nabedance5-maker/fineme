-- 未適用（本番Supabaseで実行してください）
-- 店舗専用の顧客メモ（簡易カルテ）。予約・再来店リマインドSaaS フェーズ3-D。
-- ユーザー本人には一切見せない前提のため、public read policyは作らずservice_role(APIルート)のみに絞る。

CREATE TABLE IF NOT EXISTS provider_customer_notes (
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note        TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (provider_id, user_id)
);
ALTER TABLE provider_customer_notes ENABLE ROW LEVEL SECURITY;
-- publicポリシーを作らない＝service_roleのみアクセス可能（ユーザー本人にも見せない）
