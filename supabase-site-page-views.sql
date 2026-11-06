-- ✅ 本番適用済 2026-11-06
-- サイトの閲覧の記録（運営管理画面のアナリティクス用。渡邉指摘 2026-11-06：データが全く入っていない。自動でリアルタイムに入るものでないと意味がない）。
-- 各ページを開いた時に、ブラウザから /api/track へ1件送る。個人を特定する情報は持たない
-- （訪問者IDはブラウザごとの乱数。URLのクエリはUTMだけ残し、トークン等は残さない。管理画面・契約者の管理画面・個人用URLは記録しない）。
create table if not exists site_page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null,
  section text,                 -- top / fineme / belle / feature / journal / diagnosis / mirror / provider_page / mypage / business / other
  referrer_host text,           -- どこから来たか（同じサイト内は null）
  utm_source text,
  utm_medium text,
  utm_campaign text,
  visitor_id text,              -- ブラウザごとの乱数（localStorage）
  session_id text,              -- タブを開いている間の乱数（sessionStorage）
  device text                   -- mobile / desktop
);
create index if not exists idx_site_page_views_at on site_page_views(created_at desc);
create index if not exists idx_site_page_views_visitor on site_page_views(visitor_id, created_at);
alter table site_page_views enable row level security;
-- service_role専用（書き込みは /api/track、読み出しは /api/admin/analytics だけ）
