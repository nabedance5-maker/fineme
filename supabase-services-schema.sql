-- ============================================================
-- Fineme provider_services テーブル（複数サービス対応）
-- Supabase ダッシュボード > SQL Editor で実行してください
-- ============================================================

create table if not exists provider_services (
  id          uuid default gen_random_uuid() primary key,
  provider_id uuid references providers(id) on delete cascade,
  name        text not null,         -- サービス名（例: 初回体験コース）
  description text,                  -- 説明
  price       integer not null,      -- 価格（円）
  duration    text,                  -- 所要時間（例: 60分）
  is_featured boolean default false, -- 看板メニューか
  sort_order  integer default 0,     -- 表示順
  created_at  timestamp with time zone default now()
);

alter table provider_services enable row level security;

-- 公開掲載者のサービスは誰でも読める
create policy "public read provider services"
  on provider_services for select
  using (
    exists (
      select 1 from providers p
      where p.id = provider_id
        and p.published = true
        and p.admin_hidden = false
    )
  );

-- ストレージバケット（写真アップロード用）
-- ※ Supabase Dashboard > Storage > New Bucket で以下を作成してください:
--   バケット名: provider-photos
--   Public: true（チェックあり）
