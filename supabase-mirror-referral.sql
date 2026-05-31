-- ✅ 本番適用済 2026-05-30
-- Mirror 友達紹介リファラル
-- 招待で双方に Mirror 無料チケット（mirror_referral_credits）を付与

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mirror_referral_credits INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS referrals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referee_id  UUID NOT NULL UNIQUE,   -- 1ユーザーは一度だけ被紹介される
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- 無料チケットをアトミックに+1する（競合安全）
CREATE OR REPLACE FUNCTION increment_referral_credit(uid UUID)
RETURNS void AS $$
  UPDATE profiles
  SET mirror_referral_credits = COALESCE(mirror_referral_credits, 0) + 1
  WHERE id = uid;
$$ LANGUAGE sql;
