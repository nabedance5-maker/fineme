-- ✅ 本番適用済 2026-11-15
-- 営業メール用のデモの招待コードに期限と、入った店舗名（任意）を付ける（2026-11-15 渡邉要望：
-- 一斉送信1回ごとに1つのコードを作り、14日などで自動で切れるようにする。入口で店舗名を任意で書いてもらい、入ったら渡邉にメールで知らせる）
-- - demo_invites.expires_at：これを過ぎたら入れない（null＝期限なし。これまでのコードはそのまま）
-- - demo_logins.store_name：入口で書いてもらった店舗名（任意・60文字まで）
alter table demo_invites add column if not exists expires_at timestamptz;
alter table demo_logins add column if not exists store_name text check (store_name is null or char_length(store_name) <= 60);
create index if not exists demo_logins_invite_time on demo_logins (invite_id, created_at desc);
