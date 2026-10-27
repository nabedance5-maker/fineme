-- ✅ 本番適用済 2026-10-27
-- 月会費の請求日・初月の扱い・退会の締め日をお店で決められるようにする（でお指摘 2026-10-27）。
-- 詳しい決まりは lib/membership-cycle.js。
ALTER TABLE provider_membership_settings ADD COLUMN IF NOT EXISTS billing_mode TEXT NOT NULL DEFAULT 'fixed_day' CHECK (billing_mode IN ('fixed_day', 'anniversary'));
ALTER TABLE provider_membership_settings ADD COLUMN IF NOT EXISTS billing_day INT NOT NULL DEFAULT 1 CHECK ((billing_day BETWEEN 1 AND 28) OR billing_day = 31);
ALTER TABLE provider_membership_settings ADD COLUMN IF NOT EXISTS first_month TEXT CHECK (first_month IN ('prorate', 'full', 'free'));
ALTER TABLE provider_membership_settings ADD COLUMN IF NOT EXISTS cancel_cutoff_day INT NOT NULL DEFAULT 20 CHECK ((cancel_cutoff_day BETWEEN 1 AND 28) OR cancel_cutoff_day = 31);
ALTER TABLE provider_membership_settings ADD COLUMN IF NOT EXISTS cancel_cutoff_days_before INT NOT NULL DEFAULT 10 CHECK (cancel_cutoff_days_before BETWEEN 0 AND 27);
-- 以前の「初月を日割りにする」の設定を引き継ぐ（OFF＝承認日から1か月分）
UPDATE provider_membership_settings SET first_month = CASE WHEN prorate_first_month = false THEN 'full' ELSE 'prorate' END WHERE first_month IS NULL;

-- 会員ごとの請求の基準（承認時に Stripe に設定した内容。あとで店舗の設定を変えても、既存の会員の請求日は変わらない）
ALTER TABLE provider_memberships ADD COLUMN IF NOT EXISTS billing_start_date DATE;       -- 会員としての開始日
ALTER TABLE provider_memberships ADD COLUMN IF NOT EXISTS billing_first_full_date DATE;  -- 1か月分を初めて請求する日
ALTER TABLE provider_memberships ADD COLUMN IF NOT EXISTS billing_anchor_day INT;        -- 毎月の請求日（31＝末日）
