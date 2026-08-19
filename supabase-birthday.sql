-- 未適用（本番Supabaseで実行してください）
-- 誕生日メッセージ（予約・再来店リマインドSaaS フェーズ3-F）
-- birthdayは任意入力・本人の明示登録のみ（/mypage/profileから）。

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday DATE;

-- 年1回だけ送るための重複防止台帳
CREATE TABLE IF NOT EXISTS provider_birthday_nudges (
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (provider_id, user_id, year)
);
ALTER TABLE provider_birthday_nudges ENABLE ROW LEVEL SECURITY;
-- publicポリシーを作らない＝service_roleのみアクセス可能
