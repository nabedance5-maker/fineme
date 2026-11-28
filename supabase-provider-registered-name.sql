-- ✅ 本番適用済 2026-11-28
-- 店舗名の「登録名」（2026-11-28 渡邉要望）
-- お店は管理画面のプロフィールで表示名（providers.name）を自由に変えられる。
-- 変えると運営の管理画面でどこのお店か分からなくなるため、運営だけが変えられる「登録名」と、
-- 最後に変える前の名前・変えた日時を残す。
alter table providers add column if not exists registered_name text;   -- 運営用の名前（お店のAPIからは変えられない）
alter table providers add column if not exists previous_name text;     -- お店が表示名を変える前の名前（最後の1回分）
alter table providers add column if not exists name_changed_at timestamptz; -- お店が表示名を最後に変えた日時

update providers set registered_name = name where registered_name is null;
