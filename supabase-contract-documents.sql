-- ✅ 本番適用済 2026-10-04
-- 契約書の同意記録・アップロード（でお要望2026-10-04）
-- ①掲載者がFinemeの掲載者向け利用規約に同意した日時・版を記録する
-- ②店舗とお客様が交わした契約書（紙・PDF等）を店舗がアップロードして保管し、
--   お客様（会員）も確認できるようにする。電子署名は行わず「同意の記録」に留める。
--   回数券・会員プラン・入会手続き・その他すべての契約で汎用的に使う。
-- アクセスは全てサービスロール経由のAPIルートで権限チェックする（RLSポリシーは作らない）。

-- 非公開バケット（署名付きURLで都度アクセス）
insert into storage.buckets (id, name, public)
values ('contract-documents', 'contract-documents', false)
on conflict (id) do nothing;

create table if not exists provider_terms_agreements (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  terms_version text not null,
  agreed_at timestamptz not null default now(),
  unique (provider_id, terms_version)
);
create index if not exists idx_provider_terms_agreements_provider on provider_terms_agreements(provider_id, agreed_at desc);
alter table provider_terms_agreements enable row level security;

create table if not exists customer_contract_documents (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  manual_customer_id uuid references provider_manual_customers(id) on delete cascade,
  contract_kind text not null default 'other' check (contract_kind in ('package','membership','other')),
  title text not null,
  contract_date date,
  note text,
  file_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes int,
  visible_to_customer boolean not null default true,
  customer_acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (user_id is not null and manual_customer_id is null) or
    (user_id is null and manual_customer_id is not null)
  )
);
create index if not exists idx_ccd_provider_user on customer_contract_documents(provider_id, user_id, created_at desc);
create index if not exists idx_ccd_provider_manual on customer_contract_documents(provider_id, manual_customer_id, created_at desc);
create index if not exists idx_ccd_user on customer_contract_documents(user_id, created_at desc);
alter table customer_contract_documents enable row level security;
