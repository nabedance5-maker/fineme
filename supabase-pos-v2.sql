-- ✅ 本番適用済 2026-10-19
-- POSの強化（でお要望 2026-10-19：hacomono差分 #12 ＋ 以前のPOS改善案1〜6・7・9）。
-- 施術と物販をまとめて会計・手入力の明細・割引・お客様の紐付け・支払方法の設定・レジ締め（点検・精算）・
-- 返品と取り消し・レシート/領収書・仕入と在庫の調整。

-- 店舗ごとのレジ設定（支払方法・レシートの表記・税）
create table if not exists provider_pos_settings (
  provider_id uuid primary key references providers(id) on delete cascade,
  payment_methods jsonb not null default '[{"key":"cash","label":"現金","cash":true},{"key":"card","label":"クレジットカード"},{"key":"paypay","label":"PayPay"},{"key":"emoney","label":"電子マネー"},{"key":"other","label":"その他"}]'::jsonb,
  receipt_name text,          -- レシート・領収書に載せる店名（空なら店舗名）
  receipt_address text,
  receipt_phone text,
  invoice_number text,        -- 適格請求書発行事業者の登録番号（T＋13桁）
  receipt_footer text,
  tax_rate int not null default 10,
  updated_at timestamptz not null default now()
);

-- 会計：小計・割引・お客様・状態・レシート番号・レジのセッション
alter table provider_pos_transactions add column if not exists subtotal_amount int;
alter table provider_pos_transactions add column if not exists discount_amount int not null default 0;
alter table provider_pos_transactions add column if not exists discount_label text;
alter table provider_pos_transactions add column if not exists customer_manual_id uuid references provider_manual_customers(id) on delete set null;
alter table provider_pos_transactions add column if not exists customer_name text;
alter table provider_pos_transactions add column if not exists payment_key text;            -- 支払方法のキー（集計用。payment_method は表示名）
alter table provider_pos_transactions add column if not exists cash_received int;           -- お預かり（現金）
alter table provider_pos_transactions add column if not exists status text not null default 'completed';
alter table provider_pos_transactions add column if not exists refunded_at timestamptz;
alter table provider_pos_transactions add column if not exists refund_reason text;
alter table provider_pos_transactions add column if not exists refund_sales_entry_id uuid references provider_sales_entries(id) on delete set null;
alter table provider_pos_transactions add column if not exists receipt_no text;
alter table provider_pos_transactions add column if not exists session_id uuid;
alter table provider_pos_transactions add column if not exists operator text;
alter table provider_pos_transactions drop constraint if exists provider_pos_transactions_status_check;
alter table provider_pos_transactions add constraint provider_pos_transactions_status_check check (status in ('completed', 'refunded'));

-- 明細：種類（物販・施術・手入力）と明細ごとの割引
alter table provider_pos_transaction_items add column if not exists kind text not null default 'product';
alter table provider_pos_transaction_items add column if not exists service_id uuid;
alter table provider_pos_transaction_items add column if not exists discount_amount int not null default 0;

-- 商品：カテゴリ・仕入値・在庫が少ない時の目安
alter table provider_products add column if not exists category text;
alter table provider_products add column if not exists cost_price int;
alter table provider_products add column if not exists low_stock_threshold int;

-- 在庫の動き：仕入・返品・棚卸しを足し、仕入値と仕入先を残す
alter table provider_stock_movements drop constraint if exists provider_stock_movements_reason_check;
alter table provider_stock_movements add constraint provider_stock_movements_reason_check check (reason in ('sale', 'restock', 'adjustment', 'purchase', 'refund', 'stocktake', 'loss'));
alter table provider_stock_movements add column if not exists unit_cost int;
alter table provider_stock_movements add column if not exists supplier text;
alter table provider_stock_movements add column if not exists operator text;

-- レジのセッション（開けてから締めるまで）
create table if not exists provider_register_sessions (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  opened_at timestamptz not null default now(),
  opened_by text,
  opening_cash int not null default 0,     -- 準備金
  closed_at timestamptz,
  closed_by text,
  expected_cash int,                       -- 締めた時点の「あるはずの現金」
  counted_cash int,                        -- 数えた現金
  difference int,                          -- 過不足（数えた − あるはず）
  summary jsonb,                           -- 締めた時点の集計（支払方法別・返品など）
  memo text
);
create index if not exists idx_provider_register_sessions_p on provider_register_sessions(provider_id, opened_at desc);
create unique index if not exists uq_provider_register_sessions_open on provider_register_sessions(provider_id) where closed_at is null;

-- 入金・出金（つり銭の補充、仕入の支払いなど）
create table if not exists provider_register_cash_moves (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  session_id uuid not null references provider_register_sessions(id) on delete cascade,
  kind text not null check (kind in ('in', 'out')),
  amount int not null check (amount > 0),
  reason text,
  operator text,
  created_at timestamptz not null default now()
);
create index if not exists idx_provider_register_cash_moves_s on provider_register_cash_moves(session_id);

alter table provider_pos_settings enable row level security;
alter table provider_register_sessions enable row level security;
alter table provider_register_cash_moves enable row level security;
-- service_role専用（他のprovider_*運用テーブルと同じ方針）

-- オンライン決済（QR）で払う会計にも、割引・お客様・支払い前の担当を引き継ぐ（追記 2026-10-19）
alter table provider_pos_pending_checkouts add column if not exists discount jsonb;
alter table provider_pos_pending_checkouts add column if not exists customer jsonb;
alter table provider_pos_pending_checkouts add column if not exists operator text;
