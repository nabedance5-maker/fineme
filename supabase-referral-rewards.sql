-- ============================================================
-- referral_rewards テーブル（月次紹介報酬ログ）
-- supabase-schema-v2.sql の定義と API 実装の整合を取ったバージョン
-- Supabase ダッシュボード > SQL Editor で実行
-- ============================================================

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id  TEXT NOT NULL,          -- 紹介した掲載者の id
  referred_id  TEXT NOT NULL,          -- 紹介された掲載者の id
  reward_month TEXT NOT NULL,          -- YYYY-MM（APIが reward_month を使用）
  amount       INTEGER NOT NULL DEFAULT 500,
  status       TEXT NOT NULL DEFAULT 'pending', -- pending / paid
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  paid_at      TIMESTAMPTZ,
  UNIQUE(referrer_id, referred_id, reward_month)
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
-- service_role（APIルート）からのみ操作するため public ポリシー不要

-- インデックス
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON public.referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_month    ON public.referral_rewards(reward_month);

-- reservations テーブルに unanswered_alert_sent カラム追加（予約未確認アラートCron用）
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS unanswered_alert_sent BOOLEAN DEFAULT FALSE;

-- reservations テーブルに story_reminder_sent カラム追加（体験談リマインドCron用）
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS story_reminder_sent BOOLEAN DEFAULT FALSE;
