-- ✅ 本番適用済 2026-09-14
-- シフト必要人数のパターン化（でお要望2026-09-14）。
-- 「何曜日の何時から何時に何人」を1つずつ作るのは大変、という指摘を受け、
-- 時間帯×必要人数の組み合わせを「パターン」として複数定義しておき、
-- 期間内の各日付にどのパターンを使うかをまとめて一括指定できるようにする
-- （例：パターン1を平日、パターン2を土日にまとめて割り当てる、等）。
-- 旧設計（provider_shift_settings.staffing_targets、曜日固定）はこちらに置き換える。

-- 店舗が定義する時間帯×必要人数のパターン
CREATE TABLE IF NOT EXISTS provider_shift_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- [{"start":"10:00","end":"13:00","required":2}, ...]
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shift_patterns_provider ON provider_shift_patterns(provider_id);

-- 期間内の各日付にどのパターンを使うかの割り当て（1日1パターン）
CREATE TABLE IF NOT EXISTS provider_shift_period_day_patterns (
  period_id UUID NOT NULL REFERENCES provider_shift_periods(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pattern_id UUID NOT NULL REFERENCES provider_shift_patterns(id) ON DELETE CASCADE,
  PRIMARY KEY (period_id, date)
);
