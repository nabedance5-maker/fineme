-- ✅ 本番適用済 2026-10-22
-- グループレッスンの開催回もチケットを使って予約する（でお要望 2026-10-22）。
-- メニューと同じく「使えるチケット」と「1回の予約で使う枚数」をレッスンごとに決める。空なら誰でも予約できる。
ALTER TABLE provider_classes
  ADD COLUMN IF NOT EXISTS ticket_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ticket_cost INT NOT NULL DEFAULT 1 CHECK (ticket_cost BETWEEN 1 AND 20);
NOTIFY pgrst, 'reload schema';
