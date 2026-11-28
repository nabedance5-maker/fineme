-- ✅ 本番適用済 2026-11-28
-- 休会中のオプションを止めるか続けるかを選べるようにする（2026-11-28 渡邉要望「休会中のオプションは選べるように。デフォルトはオプションも止まる」）
-- ・お店の設定 pause_keep_options：休会する時の初期値（false＝オプションも止める）
-- ・会員のオプションごとに、休会中に止めているかを paused_at で持つ（止めている間は Stripe の明細を0円にし、再開で元の金額に戻す）
-- ・オプションだけ続けて休会費0円のときは、プランの明細を0円に差し替える方式を使うので、provider_memberships.pause_fee に 0 を許す
alter table provider_membership_settings add column if not exists pause_keep_options boolean not null default false;
alter table provider_membership_option_items add column if not exists paused_at timestamptz;

alter table provider_memberships drop constraint if exists provider_memberships_pause_fee_check;
alter table provider_memberships add constraint provider_memberships_pause_fee_check
  check (pause_fee is null or (pause_fee >= 0 and pause_fee <= 1000000)); -- null＝請求を取り消す方式（オプションも止まる）、0以上＝明細を差し替える方式
