-- ✅ 本番適用済 2026-03-25
-- アフィリエイト管理：providers テーブルに entity_type と affiliate_url カラムを追加
-- entity_type: 'provider'（掲載者）または 'affiliate'（アフィリエイト）
-- affiliate_url: アフィリエイトの外部リンク先URL

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS entity_type text NOT NULL DEFAULT 'provider',
  ADD COLUMN IF NOT EXISTS affiliate_url text;
