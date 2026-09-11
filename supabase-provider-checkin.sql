-- ✅ 本番適用済 2026-09-11
-- チェックイン機能のデータモデル（hacomono/STORES網羅計画 Phase 4）。
-- 入退館管理（スマートロック連携）はでお方針で不要。会員側QR（固定トークン）を
-- 店舗がカメラで読み取ったらチェックイン完了、というシンプルな記録機能のみ作る。
-- 今野くんの実地メモ：スマホ/クレカを使えない高齢層向けに「管理画面でダミー会員代理
-- 作成→QRカード持参→店頭現金決済」という運用が必要 → offline_member_nameで非会員も記録可にする。

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS checkin_code TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS provider_checkins (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id        UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id            UUID, -- 会員のチェックイン（profiles.id）。非会員はNULL
  offline_member_name TEXT, -- 非会員・代理記録用の名前（user_idがNULLの時のみ使う）
  method             TEXT NOT NULL CHECK (method IN ('qr', 'manual')),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_checkins_provider_idx ON provider_checkins(provider_id, created_at DESC);

ALTER TABLE provider_checkins ENABLE ROW LEVEL SECURITY;
-- 来店記録は機密情報。公開読み取りは許可しない。service_role（APIルート、店舗本人の認証必須）のみ。
