-- ✅ 本番適用済 2026-09-14
-- 1人のお客様が同時に保持できる「来店前の予約」の上限数（でお要望2026-09-14）。
-- 「来店するまで次の予約を取れない」ルールのデフォルト値(=1)を店舗ごとに
-- 変更できるようにする（複数予約を許可したい店舗向け）。
alter table providers add column if not exists max_active_reservations int not null default 1;
