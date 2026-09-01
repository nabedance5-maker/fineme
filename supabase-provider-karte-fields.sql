-- ✅ 本番適用済 2026-09-01
-- 店舗が自由に定義するカルテのカスタム項目（スキーマ）。カルテ拡張フェーズA。
-- 値そのものはprovider_karte_entries.custom_valuesに{field_id: value}として入る。
-- ユーザー本人には一切見せない前提のため、public read policyは作らずservice_role(APIルート)のみに絞る。

CREATE TABLE IF NOT EXISTS provider_karte_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  field_type  TEXT NOT NULL CHECK (field_type IN ('text', 'select', 'stars')),
  options     JSONB,            -- field_type='select'の時だけ選択肢の配列。text/starsはNULL
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_provider_karte_fields_provider ON provider_karte_fields(provider_id, sort_order);
ALTER TABLE provider_karte_fields ENABLE ROW LEVEL SECURITY;
-- publicポリシーを作らない＝service_roleのみアクセス可能
