-- ✅ 本番適用済 2026-03-24
-- provider_page_views: 掲載者公開ページの日次閲覧数集計テーブル
CREATE TABLE IF NOT EXISTS provider_page_views (
  id         BIGSERIAL PRIMARY KEY,
  provider_id UUID    NOT NULL,
  date       DATE    NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  UNIQUE (provider_id, date)
);

-- インデックス（ダッシュボード月次集計用）
CREATE INDEX IF NOT EXISTS idx_ppv_provider_date ON provider_page_views (provider_id, date);

-- RLS は不要（service role でのみ操作）
