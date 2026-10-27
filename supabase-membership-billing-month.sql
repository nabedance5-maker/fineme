-- ✅ 本番適用済 2026-10-27
-- 「◯月分を、前の月／その月／次の月の◯日に請求」をお店で決める（でお要望 2026-10-27：11月分を10月中にもらう店、12月の頭にもらう店がある）。
-- 会員ごとに、承認した時の請求の基準を残す（お店があとで設定を変えても、その会員の請求は変わらない）。
ALTER TABLE provider_membership_settings ADD COLUMN IF NOT EXISTS billing_month_offset INT NOT NULL DEFAULT 0 CHECK (billing_month_offset IN (-1, 0, 1));
ALTER TABLE provider_memberships ADD COLUMN IF NOT EXISTS billing_mode TEXT;
ALTER TABLE provider_memberships ADD COLUMN IF NOT EXISTS billing_month_offset INT;
