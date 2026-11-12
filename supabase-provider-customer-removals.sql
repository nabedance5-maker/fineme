-- ✅ 本番適用済 2026-11-12
-- メンバーの削除（2026-11-12 渡邉要望「メンバーの削除をできるようにしてほしい」）
-- Finemeのアカウントがあるお客様は、お客様のアカウント・予約やカルテの記録は消さず、このお店のメンバー一覧から外すだけにする。
-- 外した後にまたこのお店で予約・入会・チケットの購入があれば、一覧に戻る（removed_at より後の動きで判断）。
create table if not exists provider_customer_removals (
  provider_id uuid not null references providers(id) on delete cascade,
  user_id uuid not null,
  removed_at timestamptz not null default now(),
  removed_by text,
  primary key (provider_id, user_id)
);
alter table provider_customer_removals enable row level security;
-- サーバー（service role）からだけ読み書きする。anon / authenticated には何も許可しない
revoke all on provider_customer_removals from anon, authenticated;
