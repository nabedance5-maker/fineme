-- ✅ 本番適用済 2026-09-30
-- 公開ページ「アピール」タブのブロック単位カスタム編集（でお要望2026-09-30）。
-- 位置・サイズ・回転まで完全自由なビルダーは崩れたページを量産するリスクが高いため、
-- 「見出し・本文・画像・ボタン・引用」の5種のブロックを上から順に並べる形に絞る。
-- provider_karte_fieldsと同じ「provider所有・sort_order付きCRUDリスト」の設計を踏襲。
create table if not exists provider_appeal_blocks (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  block_type  text not null check (block_type in ('heading','paragraph','image','button','quote')),
  content     jsonb not null default '{}'::jsonb,
  sort_order  int not null default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists idx_provider_appeal_blocks_provider on provider_appeal_blocks(provider_id, sort_order);

alter table provider_appeal_blocks enable row level security;
-- 他のprovider_*運用テーブルと同じ方針：公開readポリシーは作らず、service_role
-- （APIルート）のみに絞る。公開ページ側は app/api/providers/[slug]/appeal-blocks
-- 経由で読む（そちらでpublished確認込みで絞り込む）。
