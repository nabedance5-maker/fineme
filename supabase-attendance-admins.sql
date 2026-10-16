-- ✅ 本番適用済 2026-10-16
-- 勤怠の管理者（でお要望 2026-10-16）：管理画面に入れる人なら誰でも勤怠を直せる状態をやめ、
-- 指名した「勤怠の管理者」が自分の暗証番号でロックを解除した時だけ、打刻の追加・取り消し・
-- 端末の登録・暗証番号の設定・管理者の変更をできるようにする。
ALTER TABLE provider_staff ADD COLUMN IF NOT EXISTS attendance_admin BOOLEAN NOT NULL DEFAULT false;

-- ロック解除（15分有効）。トークンはハッシュだけ保存する。
CREATE TABLE IF NOT EXISTS provider_attendance_unlocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES provider_staff(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_attendance_unlocks_provider_idx ON provider_attendance_unlocks (provider_id, expires_at);
ALTER TABLE provider_attendance_unlocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON provider_attendance_unlocks FROM anon, authenticated;
