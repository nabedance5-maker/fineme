-- ✅ 本番適用済 2026-10-22
-- 同じメニューを「チケットを使う」か「単発で払う」か選んで予約できるようにする（でお指摘 2026-10-22：
-- チケットを紐づけるとチケット用と単発用の2つのメニューに分かれてしまい、分かりにくくトラブルの元）。
-- ticket_ids は「このメニューに使えるチケット」。ticket_only=true の時だけ、チケットが無いと予約できない。
ALTER TABLE provider_services ADD COLUMN IF NOT EXISTS ticket_only BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE provider_classes  ADD COLUMN IF NOT EXISTS ticket_only BOOLEAN NOT NULL DEFAULT FALSE;

-- これまではチケットを紐づけたメニューはチケット専用だった。料金が決まっていないものはチケット専用のまま、
-- 料金があるものは単発でも予約できるようにする
UPDATE provider_services SET ticket_only = TRUE
 WHERE COALESCE(array_length(ticket_ids, 1), 0) > 0 AND COALESCE(price, 0) = 0 AND ticket_only = FALSE;
UPDATE provider_classes SET ticket_only = TRUE
 WHERE COALESCE(array_length(ticket_ids, 1), 0) > 0 AND COALESCE(price, 0) = 0 AND ticket_only = FALSE;
