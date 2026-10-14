-- ✅ 本番適用済 2026-10-14
-- New Me Log のLINEリマインドを「記録するだけ」から「予約・購入に繋げる」ものにする（でお指摘 2026-10-14）
-- action_url    : 店舗がFinemeに無い記録でも、本人が予約ページ／購入ページを登録しておけば
--                 通知からワンタップでそこへ飛べるようにする
-- snoozed_until : 通知の「1週間後にまた」。この日までは通知しない（ブロックされない逃げ道）
alter table user_service_logs add column if not exists action_url text;
alter table user_service_logs add column if not exists snoozed_until date;
