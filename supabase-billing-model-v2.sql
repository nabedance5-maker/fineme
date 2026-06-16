-- 掲載者課金モデル v2: freemium 化
-- 旧モデル: 掲載登録時にtrial作成 → 初回予約で課金開始
-- 新モデル: 掲載は無料(free) → 月額先払いでNew Me Mapに表示(active)
--
-- ✅ 本番適用済 YYYY-MM-DD（適用後に記入）

-- 1. trialing → free に一括変換（既存掲載者は全員無料ティアへ）
UPDATE providers SET billing_status = 'free' WHERE billing_status = 'trialing';

-- 2. デフォルト値を 'free' に変更
ALTER TABLE providers ALTER COLUMN billing_status SET DEFAULT 'free';
