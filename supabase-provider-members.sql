-- ✅ 本番適用済 2026-10-19
-- スタッフ個別ログインと権限（でお要望 2026-10-19：hacomonoの管理ユーザー・ロールレベル相当）。
-- 店舗アカウント（providers.email）とは別に、スタッフが自分のメールでログインし、役割ごとに使えるメニューを分ける。
CREATE TABLE IF NOT EXISTS provider_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id       UUID,                       -- auth.users.id（招待を受けて初めてログインした時に結び付く）
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  staff_id      UUID REFERENCES provider_staff(id) ON DELETE SET NULL,
  role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('manager', 'staff')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at   TIMESTAMPTZ,
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS provider_members_email_uq ON provider_members (lower(email));
CREATE INDEX IF NOT EXISTS provider_members_user_idx ON provider_members (user_id);
CREATE INDEX IF NOT EXISTS provider_members_provider_idx ON provider_members (provider_id);

-- 役割ごとに使えるメニュー分類（店舗ごとに変更可能。行が無ければ既定値）
CREATE TABLE IF NOT EXISTS provider_role_permissions (
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('manager', 'staff')),
  perms       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider_id, role)
);

ALTER TABLE provider_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_role_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON provider_members FROM anon, authenticated;
REVOKE ALL ON provider_role_permissions FROM anon, authenticated;
