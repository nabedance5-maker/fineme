-- ✅ 本番適用済 2026-08-07
-- Mirror購入者メールの記録＋でお本人テストとの自動判別
-- app/api/mirror/result/route.js と app/api/subscription/webhook/route.js が
-- 決済確定時に書き込む。is_owner_test=false のものだけが「外部の実購入」。
-- 未適用でも決済フローは後方互換で動作するが、実購入判定・LINE即時通知は保存/送信されない。

ALTER TABLE mirror_sessions
  ADD COLUMN IF NOT EXISTS purchaser_email TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_owner_test   BOOLEAN DEFAULT NULL;
