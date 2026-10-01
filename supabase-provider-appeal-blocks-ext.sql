-- ✅ 本番適用済 2026-10-01
-- アピールタブのデフォルトセクション（ガイドの一言・強み・スタッフ紹介・New Me Map・
-- 理念・体験談・サービス一覧）も、カスタムブロックと同じ一覧で並び替え・表示/非表示を
-- 切り替えられるようにする（でお要望2026-10-01：「デフォルトで表示されているものも
-- 自由に並び替えたり内容編集したりできるように」）。
-- block_typeにbuiltin_*を追加し、hidden列を新設。本文（guide_message/unique_strengths/
-- philosophy）の実データは引き続きprovidersテーブルの該当カラムを正とする（AIマッチング
-- 分析・掲載順スコアリング・診断経由LP等、既にそちらを読む機能が多数あるため、保存先を
-- 分岐させない）。builtin_*行のcontentは使わない（常に{}）。
alter table provider_appeal_blocks drop constraint if exists provider_appeal_blocks_block_type_check;
alter table provider_appeal_blocks add constraint provider_appeal_blocks_block_type_check
  check (block_type in (
    'heading','paragraph','image','button','quote',
    'builtin_guide_message','builtin_unique_strengths','builtin_staff',
    'builtin_newme_map','builtin_philosophy','builtin_stories','builtin_program'
  ));
alter table provider_appeal_blocks add column if not exists hidden boolean not null default false;
