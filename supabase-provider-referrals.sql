-- ✅ 本番適用済 2026-09-14
-- 友達紹介プログラム（でお要望2026-09-14：hacomono機能比較で判明した不足機能。
-- hacomonoの「クチコプレミアム連携」相当機能をFineme内製で実装）。
-- 既存の店舗間紹介報酬（app/api/billing/referrals、B2B）とは別物で、こちらは
-- 「お店の会員が友達を紹介する」B2C向け。特典の内容・実際の付与は店舗の運用に
-- 委ね、Financeは「誰が誰を紹介し、予約・来店したか」の記録と通知に徹する
-- （決済を仲介しない設計方針を踏襲）。

-- 店舗ごとの設定（特典文言・有効化はenabled_featuresのreferral_programで管理）
create table if not exists provider_referral_settings (
  provider_id uuid primary key references providers(id) on delete cascade,
  reward_text text,
  updated_at timestamptz not null default now()
);

-- 会員1人につき店舗1つずつ発行される紹介コード（初回リクエスト時に自動生成）
create table if not exists provider_referral_codes (
  user_id uuid not null,
  provider_id uuid not null references providers(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  primary key (user_id, provider_id)
);

-- 実際の紹介実績（予約時にpendingで記録→来店確認時にcompletedへ）
create table if not exists provider_referrals (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  referrer_user_id uuid not null,
  referred_user_id uuid,
  referred_name text,
  reservation_id uuid references reservations(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_provider_referrals_provider on provider_referrals(provider_id, created_at desc);
create index if not exists idx_provider_referrals_referrer on provider_referrals(referrer_user_id);

alter table provider_referral_settings enable row level security;
alter table provider_referral_codes enable row level security;
alter table provider_referrals enable row level security;
-- service_role専用（他のprovider_*運用テーブルと同じ方針）
