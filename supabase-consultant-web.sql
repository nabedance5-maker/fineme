-- ✅ 本番適用済 2026-11-13
-- AIコンサルがお店の公式サイト・SNSを読んで学ぶ（2026-11-13 渡邉提案）
-- web_urls：店舗が入れたURL（最大6）／web_profile：AIが読み取った「どんなお店か」のまとめ（お店の画面とAIへの材料）
-- web_sources：URLごとの読み取りの結果（読めた・読めなかった理由）／web_fetched_at：最後に読んだ日時
alter table provider_consultant_settings add column if not exists web_urls text[] not null default '{}';
alter table provider_consultant_settings add column if not exists web_profile text;
alter table provider_consultant_settings add column if not exists web_sources jsonb not null default '[]'::jsonb;
alter table provider_consultant_settings add column if not exists web_fetched_at timestamptz;
