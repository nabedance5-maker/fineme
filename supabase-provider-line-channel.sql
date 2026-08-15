-- ✅ 本番適用済 2026-08-15
-- 店舗別LINE公式アカウント連携（予約・再来店リマインドSaaS フェーズ2）
--
-- providers テーブルは公開ページ用に published=true 行を誰でもSELECTできるRLSポリシーが
-- あり、RLSは行単位の制御しかできず列単位では絞れない。そのためチャネルの機密情報
-- （トークン等）は providers とは別テーブルに分離し、publicポリシーを一切作らず
-- service_role（APIルート経由）だけが読み書きできるようにする。

CREATE TABLE IF NOT EXISTS provider_line_channels (
  provider_id           UUID PRIMARY KEY REFERENCES providers(id) ON DELETE CASCADE,
  channel_id            TEXT,
  channel_secret        TEXT,
  channel_access_token  TEXT,
  liff_id               TEXT,           -- 顧客がその店舗チャネル上のuserIdを連携するためのLIFFアプリID
  verified_at           TIMESTAMPTZ,    -- LINE /v2/bot/info で有効性を確認した時刻
  connected_by          TEXT DEFAULT 'self',  -- 'self'（店舗が自分で入力）| 'staff'（運営が代行入力）
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE provider_line_channels ENABLE ROW LEVEL SECURITY;
-- publicポリシーを作らない＝service_roleのみアクセス可能

-- 顧客が「店舗の公式LINEチャネル」上で持つuserIdの紐づけ。
-- LINEのuserIdはチャネル（公式アカウント）ごとに別の値になる仕様のため、
-- Fineme公式チャネル上のuserId（profiles.line_user_id）とは別に保持する。
CREATE TABLE IF NOT EXISTS provider_customer_line_links (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id         UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_line_user_id  TEXT NOT NULL,
  linked_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, user_id)
);
ALTER TABLE provider_customer_line_links ENABLE ROW LEVEL SECURITY;
-- publicポリシーを作らない＝service_roleのみアクセス可能（本人にもAPI経由でのみ見せる）

CREATE INDEX IF NOT EXISTS idx_pcll_provider ON provider_customer_line_links(provider_id);
CREATE INDEX IF NOT EXISTS idx_pcll_user ON provider_customer_line_links(user_id);
