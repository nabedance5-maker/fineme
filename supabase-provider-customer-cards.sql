-- ✅ 本番適用済 2026-10-29
-- お店のレジ（スマホで払う）で、お客様が「次回からこのカードで払えるようにする」を選んだカード（2026-10-29）。
-- お店ごとに1枚。次回からはお店が会員証を読み取るだけで、このカードでお会計できる。お客様はマイページから外せる。
create table if not exists provider_customer_cards (
  provider_id uuid not null references providers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_payment_method_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider_id, user_id)
);
create index if not exists provider_customer_cards_user_idx on provider_customer_cards(user_id);
-- サーバー（service role）だけが読み書きする。公開の読み取りは作らない
alter table provider_customer_cards enable row level security;
