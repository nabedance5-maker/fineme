-- ✅ 本番適用済 2026-09-11
-- POS・物販・在庫管理のデータモデル（hacomono/STORES網羅計画 Phase 3）。
-- hacomono自身も専用レジ機ではなくiPad Webアプリ方式のため、Financeも同じ方針
-- （新規カメラ・専用端末は不要、既存ダッシュボードの新タブとして実装）。
-- provider_sales_entriesは1行=1金額のフラット集計テーブルのため変更せず、
-- POSは明細付きの別テーブル（provider_pos_transactions/_items）に記録し、
-- チェックアウト完了時に集計1行だけprovider_sales_entriesへ書き込む
-- （既存の売上集計GETロジックへの影響をゼロにするため）。

CREATE TABLE IF NOT EXISTS provider_products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  price        INTEGER NOT NULL DEFAULT 0,
  track_stock  BOOLEAN NOT NULL DEFAULT true, -- falseなら在庫数を持たない商品（回数券・施術メニュー的な物販外アイテム用）
  stock_qty    INTEGER NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT true,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_products_provider_idx ON provider_products(provider_id, active);

CREATE TABLE IF NOT EXISTS provider_pos_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  staff_id        UUID REFERENCES provider_staff(id) ON DELETE SET NULL,
  customer_user_id UUID, -- 会員なら紐付け、非会員はNULL（客側の名前はitemsではなくmemoに任意記録）
  payment_method  TEXT,
  total_amount    INTEGER NOT NULL,
  memo            TEXT,
  sales_entry_id  UUID REFERENCES provider_sales_entries(id) ON DELETE SET NULL, -- 集計行の紐付け先
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_pos_transactions_provider_idx ON provider_pos_transactions(provider_id, created_at DESC);

CREATE TABLE IF NOT EXISTS provider_pos_transaction_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES provider_pos_transactions(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES provider_products(id) ON DELETE SET NULL, -- 削除済み商品でも明細は残す
  name_snapshot   TEXT NOT NULL, -- 商品名変更後も過去レシートの表示が変わらないようスナップショット
  unit_price      INTEGER NOT NULL,
  qty             INTEGER NOT NULL CHECK (qty > 0),
  subtotal        INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS provider_pos_transaction_items_tx_idx ON provider_pos_transaction_items(transaction_id);

CREATE TABLE IF NOT EXISTS provider_stock_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES provider_products(id) ON DELETE CASCADE,
  delta          INTEGER NOT NULL, -- 販売はマイナス、入荷・棚卸修正はプラスまたはマイナス
  reason         TEXT NOT NULL CHECK (reason IN ('sale', 'restock', 'adjustment')),
  transaction_id UUID REFERENCES provider_pos_transactions(id) ON DELETE SET NULL,
  memo           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS provider_stock_movements_product_idx ON provider_stock_movements(product_id, created_at DESC);

-- 既存の売上管理（source: reservation/manual）にPOS経由を追加
ALTER TABLE provider_sales_entries DROP CONSTRAINT IF EXISTS provider_sales_entries_source_check;
ALTER TABLE provider_sales_entries
  ADD CONSTRAINT provider_sales_entries_source_check
  CHECK (source IN ('reservation', 'manual', 'pos'));

ALTER TABLE provider_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_pos_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_stock_movements ENABLE ROW LEVEL SECURITY;
-- 売上・在庫は機密情報。公開読み取りは許可しない。service_role（APIルート、店舗本人の認証必須）のみ。
