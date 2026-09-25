-- ✅ 本番適用済 2026-09-25
-- でお要望2026-09-25（今野くんとのLINE「AI姿勢分析、AI運動メニュー作成」より）：
-- 来店時にスタッフが撮影した写真をAIが分析し、姿勢のスコア・気になる癖・凝っていそうな
-- 筋肉部位を提案する機能。10000円プランへの差別化訴求として位置づけ、お客様には直接
-- 見せず店舗スタッフがダッシュボード内で記録・閲覧する運用（でお確認2026-09-25）。
-- カルテ（provider_karte_entries/provider_manual_customers）と同じ、会員/非会員
-- どちらも記録できる二者択一FK設計を踏襲する。
CREATE TABLE IF NOT EXISTS provider_posture_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id        UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  manual_customer_id UUID REFERENCES provider_manual_customers(id) ON DELETE CASCADE,
  staff_id           UUID REFERENCES provider_staff(id) ON DELETE SET NULL,
  photo_url          TEXT NOT NULL,
  score              INT,                          -- 0-100の総合姿勢スコア（AI採点）
  findings           JSONB NOT NULL DEFAULT '[]'::jsonb, -- AIが挙げた癖・凝っていそうな部位等の箇条書き配列
  note               TEXT,                          -- スタッフの自由記述メモ
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT provider_posture_entries_one_customer_check CHECK (
    (user_id IS NOT NULL AND manual_customer_id IS NULL) OR
    (user_id IS NULL AND manual_customer_id IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_provider_posture_entries_user ON provider_posture_entries(provider_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_posture_entries_manual ON provider_posture_entries(provider_id, manual_customer_id, created_at DESC);
ALTER TABLE provider_posture_entries ENABLE ROW LEVEL SECURITY;
-- 他のカルテ系テーブルと同様、公開readポリシーは作らずservice_role(APIルート)のみに絞る。
