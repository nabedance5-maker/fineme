-- ✅ 本番適用済 2026-10-30
-- お店が問い合わせてから契約・利用開始するまでの流れ（2026-10-30）
-- ① 問い合わせで選んだプランと、そこから作ったアカウントを残す（管理画面の「アカウントを作る」）
ALTER TABLE provider_inquiries ADD COLUMN IF NOT EXISTS desired_plan TEXT CHECK (desired_plan IN ('A', 'B', 'C'));
ALTER TABLE provider_inquiries ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES providers(id) ON DELETE SET NULL;

-- ② 月額が止まった（解約・未払い）ために公開をやめたお店の目印。また払われたら公開に戻す
ALTER TABLE providers ADD COLUMN IF NOT EXISTS billing_unpublished BOOLEAN NOT NULL DEFAULT false;
