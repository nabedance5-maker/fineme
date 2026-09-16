-- ✅ 本番適用済 2026-09-16
-- 入会手続き（月会費の会員登録）をFinemeで完結できるようにする（でお要望2026-09-15〜16）。
-- 決済はStripe本実装。ただし日本向けの銀行口座引き落とし（口座振替）はStripeが対応して
-- いない（アジア太平洋圏の銀行口座引き落としはBECS豪州／NZ BECSのみで日本は無し。要調査
-- 済み）ため、V1はクレジットカードのみとする。口座振替は将来的に別の国内決済代行会社
-- （GMO・ROBOT PAYMENT等）との連携が必要になる別プロジェクトとして扱う。
--
-- 決済フローは既存のStripe Checkout（ホスト型決済ページ）方式を踏襲：
-- ①お客様がFineme上で個人情報・プラン・緊急連絡先・本人確認書類・規約同意を入力
-- ②Stripe Checkout（mode:'setup'）でカードを保存（この時点ではまだ課金しない＝仮契約）
-- ③店舗がダッシュボードで内容を確認して「承認」→ここで初めてStripe Subscriptionを作成し
--   初回課金が走る（日割り設定があれば日割り額）。資金は店舗のStripe Connectアカウントへ
--   transfer_data.destinationで送金される（既存の紹介報酬送金と同じConnect基盤を流用）。

-- 本人確認書類（免許証・保険証・パスポートのみ想定。マイナンバーは対象外——マイナンバー法で
-- 収集・保管できる事務が限定されており、通常の会員登録用途では集めるべきでないため）用の
-- 非公開バケット。既存のmirror-photosと同じ非公開＋署名付きURLでの都度アクセス方式。
insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', false)
on conflict (id) do nothing;

-- 店舗が作る会員プラン（月額）。stripe_price_idはプラン作成時にStripe Product/Priceを
-- 自動作成して保存する。
create table if not exists provider_membership_plans (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  monthly_price int not null check (monthly_price > 0),
  description text,
  stripe_product_id text,
  stripe_price_id text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_provider_membership_plans_provider on provider_membership_plans(provider_id, sort_order);

-- 店舗ごとの入会手続きカスタマイズ設定（でお要望：「各項目は店舗ごとにカスタマイズ
-- できるようにしておけばいい」）
create table if not exists provider_membership_settings (
  provider_id uuid primary key references providers(id) on delete cascade,
  prorate_first_month boolean not null default true,
  require_id_document boolean not null default true,
  terms_text text,
  updated_at timestamptz not null default now()
);

-- 入会申込・会員記録の本体
create table if not exists provider_memberships (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references provider_membership_plans(id) on delete set null,

  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'active', 'rejected', 'cancelled')),

  -- 基本情報
  last_name text,
  first_name text,
  birthdate date,
  postal_code text,
  address text,
  phone text,

  -- 入会日・日割り
  enrollment_date date,
  prorated_first_amount int, -- 申込時点のスナップショット（店舗が後で料金を変えても過去申込には影響しない）

  -- ロッカー（任意オプション。後から追加も可能なため、実際の契約管理は既存の
  -- provider_locker_contractsで行い、ここはあくまで入会時に希望したかの記録）
  locker_id uuid references provider_lockers(id) on delete set null,

  -- 緊急連絡先
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text,

  -- 本人確認書類（id-documentsバケット内のパスのみ。公開URLではない）
  id_document_path text,

  -- 規約同意：同意した時点の店舗規約テキストをスナップショットとして保存
  -- （後から店舗が規約を変更しても、この申込が同意した内容は変わらない）
  terms_snapshot text,
  terms_agreed_at timestamptz,

  -- Stripe（顧客・保存済み支払い方法・実際のサブスクリプション）
  stripe_customer_id text,
  stripe_payment_method_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,

  approved_at timestamptz,
  rejected_at timestamptz,
  reject_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_provider_memberships_provider on provider_memberships(provider_id, status, created_at desc);
create index if not exists idx_provider_memberships_user on provider_memberships(user_id);

alter table provider_membership_plans enable row level security;
alter table provider_membership_settings enable row level security;
alter table provider_memberships enable row level security;
-- service_role専用（他のprovider_*運用テーブルと同じ方針。お客様自身の申込操作も
-- 全てAPI経由・service roleで行い、本人確認はAPI側のsupabase.auth.getUser()で行う）
