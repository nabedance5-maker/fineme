-- ✅ 本番適用済 2026-10-01
-- 「今日の業務」タブに追加できるカードの種類を増やす（でお要望2026-10-01：
-- 「他にもいろんなカードを追加できるようにしてほしい」）。既存API（紹介実績・
-- 出欠確認イベント・休眠顧客・クラス一覧）をそのまま再利用するだけの追加カードのため、
-- block_typeの選択肢を広げるだけでよい。
alter table provider_today_blocks drop constraint if exists provider_today_blocks_block_type_check;
alter table provider_today_blocks add constraint provider_today_blocks_block_type_check
  check (block_type in (
    'builtin_reservations', 'builtin_requests', 'builtin_checkin', 'builtin_sales',
    'builtin_referrals', 'builtin_events', 'builtin_dormant', 'builtin_classes',
    'memo'
  ));
