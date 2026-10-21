-- ✅ 本番適用済 2026-10-21
-- 予約の受付を「空き枠」から「その場の計算」へ（でお要望 2026-10-21：空き枠の設定が分かりづらい。スタッフ・部屋を登録しているのに
-- さらに枠を作るのは意味が分からない。グループレッスンで使っている人・部屋は他のメニューで予約できてはならない）。
-- 受付できる時間は、営業時間・シフト・休憩・部屋・メニューの長さ・入っている予約・グループレッスンから毎回計算する。

-- 店舗：何で予約を受けるか（staff=スタッフ / resource=部屋・席 / both=スタッフと部屋の両方 / capacity=人数）。空なら自動判定
alter table providers add column if not exists booking_unit text;
alter table providers drop constraint if exists providers_booking_unit_check;
alter table providers add constraint providers_booking_unit_check check (booking_unit is null or booking_unit in ('staff', 'resource', 'both', 'capacity'));
alter table providers add column if not exists booking_interval_minutes int not null default 30;   -- 開始時刻の刻み
alter table providers add column if not exists store_capacity int not null default 1;              -- 人数で受ける時の同時に受ける人数

-- メニュー：担当できるスタッフ（空＝予約を受けるスタッフ全員）・使う部屋（空＝どの部屋でも／部屋を使わない）
alter table provider_services add column if not exists staff_ids uuid[] not null default '{}';
alter table provider_services add column if not exists resource_ids uuid[] not null default '{}';

-- グループレッスン：使う部屋（登録した部屋から選ぶ。開催中はその部屋を他の予約に使わせない）
alter table provider_classes add column if not exists resource_id uuid references provider_resources(id) on delete set null;
