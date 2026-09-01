-- 店舗が来店ごとに追記していくカルテの履歴。カルテ拡張フェーズB。
-- 既存のprovider_customer_notes（1顧客1行・上書き式の固定メモ）とは別レイヤー。
-- こちらは追記式（1回の記録＝1行）にすることで、AI傾向分析（フェーズC）が
-- 実際の履歴を時系列で参照できるようにする。
-- ユーザー本人には一切見せない前提のため、public read policyは作らずservice_role(APIルート)のみに絞る。

CREATE TABLE IF NOT EXISTS provider_karte_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note          TEXT,
  custom_values JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {field_id: value}のマップ（provider_karte_fields参照）
  staff_id      UUID REFERENCES provider_staff(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provider_karte_entries_lookup ON provider_karte_entries(provider_id, user_id, created_at DESC);
ALTER TABLE provider_karte_entries ENABLE ROW LEVEL SECURITY;
-- publicポリシーを作らない＝service_roleのみアクセス可能
