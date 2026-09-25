-- ✅ 本番適用済 2026-09-25
-- でお要望2026-09-25（今野くんとのLINE「既読一覧見れるといいですね」より）：
-- 予約リクエストの一覧に既読/未読の区別を追加する。statusのpending件数だけでは
-- 「確認済みだがまだ承認していない」を判別できず、見落とし対策にならなかった。
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
