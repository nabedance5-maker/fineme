-- Mirror フリーミアム化: 月1回まるごと無料お試し枠 + 顔/全身写真の使い分け
-- app/api/mirror/analyze/route.js が判定・書き込みに使用する。
-- 未適用でも analyze は後方互換フォールバックで動作するが、お試し判定・photo_type は保存されない。

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mirror_trial_month TEXT DEFAULT NULL;

ALTER TABLE mirror_sessions
  ADD COLUMN IF NOT EXISTS photo_type  TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS client_ip   TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS trial_month TEXT        DEFAULT NULL;
