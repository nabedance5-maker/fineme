-- ✅ 本番適用済 2026-10-10
-- 協業者（経営陣格）向け報酬の計算・記録基盤（でお方針2026-10-08・業務委託契約書第4条）
--
-- 一般の営業パートナー： 初月 = 紹介した店舗の初回課金額(税抜)の90% ＋ 継続 = 紹介した店舗ごと月¥500
--   → 既存の referral_rewards に記録（lib/collaborator-rewards.js が webhook から呼ぶ）
-- 協業者（sales_partners.is_collaborator = true）：
--   ①オーバーライド：掲載2ヶ月目以降の全掲載者について、受領した掲載料(税抜)の10%を毎月
--                   （自分の紹介かどうかは問わない）
--   ②自分が紹介した店舗の初月：受領した掲載料(税抜)の90%（別枠・①に上乗せ）
--   ③一般の継続¥500/月は付かない（①に包含）
--   ④自店舗（sales_partners.provider_id）と excluded_provider_ids の店舗は計算対象外

alter table sales_partners
  add column if not exists is_collaborator boolean not null default false,
  add column if not exists collaborator_rate numeric(4,3) not null default 0.100,
  add column if not exists excluded_provider_ids uuid[] not null default '{}';

-- 掲載料の受領記録（Stripe請求書単位）。「掲載2ヶ月目以降」の判定と返金追跡の根拠。
create table if not exists provider_payments (
  id               uuid primary key default gen_random_uuid(),
  provider_id      uuid not null references providers(id) on delete cascade,
  stripe_invoice_id text not null unique,
  reward_month     text not null,            -- YYYY-MM（JST）
  amount_paid      integer not null,         -- 税込の受領額
  amount_excl_tax  integer not null,         -- 税抜の受領額（報酬計算の基準）
  is_first_payment boolean not null default false,
  refunded         boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists idx_provider_payments_provider on provider_payments(provider_id);
create index if not exists idx_provider_payments_month on provider_payments(reward_month);

create table if not exists collaborator_rewards (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references sales_partners(id) on delete cascade,
  provider_id   uuid not null references providers(id) on delete cascade,
  payment_id    uuid not null references provider_payments(id) on delete cascade,
  reward_month  text not null,
  kind          text not null check (kind in ('override', 'first_month')),
  basis_amount  integer not null,            -- 計算の基準額（税抜受領額）
  rate          numeric(4,3) not null,       -- 適用した率（0.100 / 0.900）
  amount        integer not null,            -- 報酬額（円・切り捨て）
  status        text not null default 'pending' check (status in ('pending', 'paid', 'void')),
  paid_at       timestamptz,
  note          text,
  created_at    timestamptz not null default now(),
  unique (partner_id, payment_id, kind)
);
create index if not exists idx_collab_rewards_partner on collaborator_rewards(partner_id, reward_month);

alter table provider_payments enable row level security;
alter table collaborator_rewards enable row level security;
-- service_role（APIルート）からのみ操作するため public ポリシー不要
