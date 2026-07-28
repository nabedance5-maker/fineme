-- ✅ 本番適用済 2026-07-28
--
-- アフィリエイト期間限定キャンペーン用の campaign フィールド。
-- providers.campaign(jsonb) に { active, label, starts_at, ends_at, items[], disclaimers[] } を格納する。
-- 表示は app/affiliate/[slug]/page.js が starts_at〜ends_at（JST）の期間内のみ自動表示。
-- 期間を過ぎると自動的に消えるため、8月終了後の手動作業は不要。
--
-- 【完全に取り消したい場合（8月終了後など、任意）】
--   UPDATE providers SET campaign = NULL WHERE slug = 'fn018';

-- 1) カラム追加（既存なら何もしない）
ALTER TABLE providers ADD COLUMN IF NOT EXISTS campaign jsonb;

-- 2) ゴリラクリニック（fn018）8月キャンペーンを設定
--    ※ 2026-08-01〜2026-08-31 の期間のみ自動表示される
UPDATE providers
SET campaign = jsonb_build_object(
  'active', true,
  'label', '8月限定キャンペーン',
  'starts_at', '2026-08-01',
  'ends_at', '2026-08-31',
  'items', jsonb_build_array(
    'ヒゲ脱毛　回数コース 10％OFF',
    '全身脱毛（平日限定）　回数コース 15％OFF'
  ),
  'disclaimers', jsonb_build_array(
    '回数コースをご契約の方に限ります。',
    '一部対象外のプランがございます。',
    '8月31日までのご契約に限ります。',
    '他割引との併用は不可となります。',
    '［ヒゲ脱毛］麻酔無料はゴリラクリニックで初めてご契約される方限定。',
    '［ヒゲ脱毛］対象プランをご契約の場合、麻酔クリーム1回分無料。',
    '［ヒゲ脱毛］麻酔無料はヒゲ脱毛のスタートプラン、セットプラン、単部位6回コースが対象となります。',
    '［全身脱毛］平日にお通いいただくことが条件となります。'
  )
)
WHERE slug = 'fn018';
