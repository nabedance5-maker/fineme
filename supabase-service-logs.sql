-- New Me Log: ユーザーが定期通いしているサービスを管理するテーブル
-- ✅ 本番適用済 YYYY-MM-DD （適用後に日付を記入）
CREATE TABLE IF NOT EXISTS user_service_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  axis            TEXT NOT NULL,              -- hair / body / eyebrow / skin / hairremoval / teeth / nail
  name            TEXT NOT NULL,              -- サービス名（自由記述）
  provider_slug   TEXT,                       -- Fineme掲載プロバイダーのslug（任意）
  provider_type   TEXT,                       -- 'provider' | 'affiliate' | 'external'
  frequency_weeks INTEGER,                    -- 通う頻度（週単位）
  last_visit      DATE,                       -- 前回利用日
  next_visit      DATE,                       -- 次回予約日
  memo            TEXT,                       -- メモ（担当者名など）
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS有効化
ALTER TABLE user_service_logs ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のレコードのみ操作可能
CREATE POLICY "user_service_logs_own" ON user_service_logs
  FOR ALL USING (auth.uid() = user_id);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_service_logs_user_id ON user_service_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_service_logs_next_visit ON user_service_logs(next_visit);
