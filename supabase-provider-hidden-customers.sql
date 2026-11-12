-- ✅ 本番適用済 2026-11-12
-- お客様の非表示（2026-11-12 渡邉要望「削除じゃなくて非表示ならできるようにする」）
-- 入会中・チケットが残っている等で削除できないお客様も含め、メンバー一覧の表示からだけ外す。
-- 記録・配信・予約・POS・チケットなどの動きは何も変えない（一覧の見た目だけ）。いつでも表示に戻せる。
create table if not exists provider_hidden_customers (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  user_id uuid,
  manual_customer_id uuid references provider_manual_customers(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  hidden_by text,
  check ((user_id is not null) <> (manual_customer_id is not null))
);
create unique index if not exists provider_hidden_customers_user on provider_hidden_customers(provider_id, user_id) where user_id is not null;
create unique index if not exists provider_hidden_customers_manual on provider_hidden_customers(provider_id, manual_customer_id) where manual_customer_id is not null;
alter table provider_hidden_customers enable row level security;
revoke all on provider_hidden_customers from anon, authenticated;
