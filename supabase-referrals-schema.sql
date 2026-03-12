-- referral_rewards テーブル
-- 紹介報酬の月次記録。referrer_id が紹介した掲載者、referred_id が紹介された掲載者。
-- ※ 既存テーブルを削除して再作成（month→reward_month リネーム対応）
DROP TABLE IF EXISTS referral_rewards;
CREATE TABLE referral_rewards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid REFERENCES providers(id) ON DELETE CASCADE,  -- 紹介した掲載者
  referred_id uuid REFERENCES providers(id) ON DELETE CASCADE,  -- 紹介された掲載者
  reward_month text NOT NULL,  -- 'YYYY-MM' 形式
  amount integer NOT NULL DEFAULT 500,  -- 報酬額（円）
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  created_at timestamptz DEFAULT now()
);

-- 同一月に同じ紹介者/被紹介者ペアが重複しないようにする
CREATE UNIQUE INDEX IF NOT EXISTS referral_rewards_unique ON referral_rewards(referrer_id, referred_id, reward_month);

-- RLS を有効化
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- service_role のみフルアクセス（APIサーバー経由でのみ操作）
CREATE POLICY "service role full access" ON referral_rewards FOR ALL USING (auth.role() = 'service_role');
