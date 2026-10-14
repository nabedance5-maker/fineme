-- ✅ 本番適用済 2026-10-14
-- 勤怠管理（店頭タブレット1台での打刻）
-- 打刻用端末：店舗が管理画面で発行した登録コードを入力した端末だけが打刻できる
CREATE TABLE IF NOT EXISTS provider_attendance_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '店頭タブレット',
  token_hash text,
  pairing_code text,
  pairing_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  paired_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS provider_attendance_devices_provider_idx ON provider_attendance_devices(provider_id);
CREATE UNIQUE INDEX IF NOT EXISTS provider_attendance_devices_token_idx ON provider_attendance_devices(token_hash) WHERE token_hash IS NOT NULL;

-- 打刻：消さない（修正は取り消し＋追加で残す）
CREATE TABLE IF NOT EXISTS provider_attendance_punches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES provider_staff(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('in', 'break_start', 'break_end', 'out')),
  punched_at timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'kiosk' CHECK (source IN ('kiosk', 'manual')),
  device_id uuid REFERENCES provider_attendance_devices(id) ON DELETE SET NULL,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  voided_by text,
  void_reason text
);
CREATE INDEX IF NOT EXISTS provider_attendance_punches_lookup ON provider_attendance_punches(provider_id, punched_at);
CREATE INDEX IF NOT EXISTS provider_attendance_punches_staff ON provider_attendance_punches(staff_id, punched_at);

-- スタッフの打刻用暗証番号（ハッシュのみ保存）と、続けて間違えた時のロック
ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS attendance_pin_hash text;
ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS attendance_pin_failures int NOT NULL DEFAULT 0;
ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS attendance_pin_locked_until timestamptz;

ALTER TABLE provider_attendance_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_attendance_punches ENABLE ROW LEVEL SECURITY;
