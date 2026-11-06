-- ✅ 本番適用済 2026-11-06
-- 営業パートナー・協業者への報酬を、Stripe Connect で自動送金する（2026-11-06 渡邉要望：手作業をなくしたい）。
-- 受け取り口座：sales_partners.stripe_connect_*（自分のお店の口座があるパートナーはお店の口座へ送る）
-- 送金の記録：partner_payouts（パートナー×送金月で1回）。どの報酬を払ったかは各報酬行の stripe_transfer_id
ALTER TABLE sales_partners ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;
ALTER TABLE sales_partners ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT;

ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;
ALTER TABLE collaborator_rewards ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;

CREATE TABLE IF NOT EXISTS partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES sales_partners(id) ON DELETE CASCADE,
  payout_month TEXT NOT NULL,               -- 送金した月 'YYYY-MM'（前月までの報酬をまとめて送る）
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',      -- paid / failed
  stripe_transfer_id TEXT,
  destination TEXT,                         -- 送金先の Stripe 口座ID
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_id, payout_month)
);
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;
