-- ✅ 本番適用済 2026-11-02
-- 店舗運営ガイド・営業パートナーガイドの自動追加分（2026-11-02）。
-- 最初の12本は lib/biz-guide.js に固定で持ち、週1の cron（/api/cron/biz-guide）がAIで1本ずつここへ足す。
-- audience: shop（店舗運営者向け・/shop-guide）| partner（営業パートナー候補向け・/sales-partner/guide）
create table if not exists biz_guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  audience text not null check (audience in ('shop', 'partner')),
  topic_key text,
  title text not null,
  description text not null,
  lead text not null,
  sections jsonb not null default '[]'::jsonb,
  fineme text not null,
  faq jsonb not null default '[]'::jsonb,
  related jsonb not null default '[]'::jsonb,
  status text not null default 'published' check (status in ('published', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists biz_guides_audience_idx on biz_guides (audience, status, created_at desc);
alter table biz_guides enable row level security;
