-- ✅ 本番適用済 2026-10-22
-- ⚠️ 2026-10-22 廃止：provider_store_members は supabase-drop-store-members.sql で削除済み（会員かどうかはプラン・チケットで判定）
-- お店の会員（でお要望 2026-10-22：会員登録＝お店の会員になる。プラン契約・チケットは別）。
-- ※ provider_members はスタッフ個別ログイン用の既存テーブルのため、別の名前で作る
--   （supabase-tickets.sql の CREATE TABLE IF NOT EXISTS provider_members は既存表があったため何もしていない）。
CREATE TABLE IF NOT EXISTS provider_store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'withdrawn')),
  registered_by TEXT NOT NULL DEFAULT 'online' CHECK (registered_by IN ('online', 'store')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider_id, user_id)
);
ALTER TABLE provider_store_members ENABLE ROW LEVEL SECURITY;
NOTIFY pgrst, 'reload schema';
