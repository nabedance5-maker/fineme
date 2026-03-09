-- ============================================================
-- Fineme — Supabase スキーマ v2
-- Supabase ダッシュボード > SQL Editor で実行してください
-- （supabase-schema.sql の後に実行する）
-- ============================================================

-- ① reservations テーブルを再定義（v1より詳細化）
DROP TABLE IF EXISTS public.reservations CASCADE;

CREATE TABLE public.reservations (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- ユーザー情報
  user_id               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name             TEXT NOT NULL,
  user_contact          TEXT NOT NULL,          -- メール or 電話番号
  note                  TEXT DEFAULT '',
  -- 掲載者・サービス情報
  provider_id           TEXT NOT NULL,          -- glowup:providers の id
  service_id            TEXT,
  service_name          TEXT,
  price                 INTEGER DEFAULT 0,      -- 円
  commission_rate       DECIMAL(4,2) DEFAULT 0.08,
  -- 予約日時
  reserved_date         DATE NOT NULL,
  start_time            TEXT NOT NULL,          -- HH:mm
  end_time              TEXT DEFAULT '',
  -- ステータス
  status                TEXT DEFAULT 'pending', -- pending/approved/cancelled/expired/visited
  provider_comment      TEXT DEFAULT '',
  -- 流入元・追跡
  origin                TEXT DEFAULT 'direct',
  -- タイムスタンプ
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  approved_at           TIMESTAMPTZ,
  visited_at            TIMESTAMPTZ,
  user_cancelled_at     TIMESTAMPTZ,
  provider_cancelled_at TIMESTAMPTZ
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の予約を参照・作成・更新可能
CREATE POLICY "自分の予約を参照" ON public.reservations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "予約を作成" ON public.reservations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "自分の予約を更新（キャンセル等）" ON public.reservations
  FOR UPDATE USING (auth.uid() = user_id);

-- 掲載者は自分宛の予約を参照・更新可能（service_role経由でAPIから操作）
-- ※掲載者はSupabase Authを使わないため、APIルートからservice_roleで操作する

-- ② providers テーブル（掲載者の基本情報・Supabase非依存）
CREATE TABLE IF NOT EXISTS public.providers (
  id            TEXT PRIMARY KEY,         -- glowup:providers と同じid
  name          TEXT NOT NULL,
  email         TEXT,
  plan          TEXT DEFAULT 'A',         -- A/B/C
  status        TEXT DEFAULT 'pending',   -- pending/approved/suspended
  stripe_customer_id  TEXT,
  stripe_subscription_id TEXT,
  billing_status TEXT DEFAULT 'trialing', -- trialing/active/cancelled
  referral_code TEXT UNIQUE,
  referred_by   TEXT,                     -- 紹介者の provider_id
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
-- providersはservice_role（APIルート）からのみ操作するためpublicポリシー不要

-- ③ referrals テーブル（紹介報酬トラッキング）
CREATE TABLE IF NOT EXISTS public.referrals (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id     TEXT NOT NULL,           -- 紹介した掲載者のprovider_id
  referred_id     TEXT NOT NULL,           -- 紹介された掲載者のprovider_id
  status          TEXT DEFAULT 'active',   -- active/stopped
  reward_per_month INTEGER DEFAULT 500,    -- 円/月
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  stopped_at      TIMESTAMPTZ,
  UNIQUE(referrer_id, referred_id)
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- ④ referral_rewards テーブル（月次報酬ログ）
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id     TEXT NOT NULL,
  referred_id     TEXT NOT NULL,
  year_month      TEXT NOT NULL,           -- YYYY-MM
  amount          INTEGER NOT NULL,        -- 円
  paid            BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id, year_month)
);
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- ⑤ stories テーブル（体験談）
CREATE TABLE IF NOT EXISTS public.stories (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id  UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_id     TEXT NOT NULL,
  service_name    TEXT,
  -- 体験談内容
  concern_before  TEXT NOT NULL,           -- Q1: 利用前の悩み
  change_after    TEXT NOT NULL,           -- Q2: 変化
  love_impact     TEXT,                    -- Q3: 恋愛・人間関係への影響
  recommend_to    TEXT,                    -- Q4: おすすめ対象
  tags            TEXT[],                  -- ['#デート成功', '#印象UP' ...]
  rating          INTEGER DEFAULT 5,       -- 1-5
  -- 審査
  status          TEXT DEFAULT 'pending',  -- pending/approved/rejected
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "承認済み体験談は全員参照可" ON public.stories
  FOR SELECT USING (status = 'approved');
CREATE POLICY "自分の体験談を作成" ON public.stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "自分の体験談を参照" ON public.stories
  FOR SELECT USING (auth.uid() = user_id);
