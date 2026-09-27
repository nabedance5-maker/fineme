-- ✅ 本番適用済 2026-09-27
-- でお要望2026-09-27（今野くん発案）：人間ドック等の結果写真＋任意の入力テキストを
-- AIが読み、体調・生活面のアドバイスを出す機能。姿勢分析（provider_posture_entries）と
-- 同じ会員/非会員どちらも記録できる設計を踏襲する。将来カテゴリ（パーソナルカラー・
-- 骨格診断等）を追加できるよう、category列で区分する（v1は'medical_checkup'＝人間ドックのみ）。
CREATE TABLE IF NOT EXISTS provider_health_advice_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id        UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  manual_customer_id UUID REFERENCES provider_manual_customers(id) ON DELETE CASCADE,
  staff_id           UUID REFERENCES provider_staff(id) ON DELETE SET NULL,
  category           TEXT NOT NULL DEFAULT 'medical_checkup',
  advice_axis        TEXT,                          -- 欲しいアドバイスの軸（例: diet/exercise/lifestyle/overall）
  photo_url          TEXT NOT NULL,
  input_text         TEXT,                          -- 結果表の数値等、OCRで読み違えないよう補足入力（任意）
  advice             JSONB NOT NULL DEFAULT '[]'::jsonb, -- AIが返したアドバイスの箇条書き配列
  note               TEXT,                          -- スタッフの自由記述メモ
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT provider_health_advice_entries_one_customer_check CHECK (
    (user_id IS NOT NULL AND manual_customer_id IS NULL) OR
    (user_id IS NULL AND manual_customer_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_provider_health_advice_entries_user ON provider_health_advice_entries(provider_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_health_advice_entries_manual ON provider_health_advice_entries(provider_id, manual_customer_id, created_at DESC);
ALTER TABLE provider_health_advice_entries ENABLE ROW LEVEL SECURITY;
-- 他のカルテ系テーブルと同様、公開readポリシーは作らずservice_role(APIルート)のみに絞る。
