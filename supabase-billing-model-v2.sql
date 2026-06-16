-- 掲載者課金モデル v2: freemium 化
-- 旧モデル: 掲載登録時にtrial作成 → 初回予約で課金開始
-- 新モデル: 掲載は無料(free) → 月額先払いでNew Me Mapに表示(active)
--
-- ✅ 本番適用済 YYYY-MM-DD（適用後に記入）

-- 1. billing_status カラムを追加（存在しない場合のみ）
ALTER TABLE providers ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'free';

-- 2. stripe_subscription_id カラムも念のため追加（未存在の場合）
ALTER TABLE providers ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- 3. 既存の billing_started（課金済みの掲載者）を 'active' に設定
--    billing_started が入っている = 旧モデルで実際に課金が始まっていた掲載者
UPDATE providers SET billing_status = 'active' WHERE billing_started IS NOT NULL;

-- 4. まだ NULL の行を 'free' に統一
UPDATE providers SET billing_status = 'free' WHERE billing_status IS NULL;

-- 5. デフォルト値を 'free' に変更
ALTER TABLE providers ALTER COLUMN billing_status SET DEFAULT 'free';
