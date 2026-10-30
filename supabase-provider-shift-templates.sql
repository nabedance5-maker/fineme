-- ✅ 本番適用済 2026-10-30
-- いつものシフト（スタッフごと・曜日ごとの決まった勤務時間。2026-10-30）
-- 「かんたん作成」で、選んだ月の確定していない日に、この形のままシフトを入れる（休み希望・有給・すでに入っている日は飛ばす）
CREATE TABLE IF NOT EXISTS provider_shift_templates (
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES provider_staff(id) ON DELETE CASCADE,
  weekday     SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=日曜
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider_id, staff_id, weekday)
);
ALTER TABLE provider_shift_templates ENABLE ROW LEVEL SECURITY;
