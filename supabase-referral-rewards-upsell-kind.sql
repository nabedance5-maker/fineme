-- ✅ 本番適用済 2026-11-08
-- referral_rewards に kind を追加し、プラン変更によるアップセル報酬を記録できるようにする。
-- 渡邉決定（2026-11-08・宮前様宛メール）：営業パートナーが紹介した店舗が契約後に上位プランへ
-- 変更した場合、変更後と変更前の月額差額の90%を、変更があった月の追加報酬として加算する。
-- 例：ライト（¥5,000）→プレミアム（¥10,000）、差額¥5,000×90%=¥4,500。
-- 継続報酬（1店舗あたり月¥500）・支払い時期（月末締め翌月末）は変更なし。
--
-- 従来の一意インデックス(referrer_id, referred_id, reward_month)は、同じ月に継続報酬と
-- アップセル報酬が両方発生するケースを想定していなかったため、kindを加えて区別する。

alter table referral_rewards add column if not exists kind text;
update referral_rewards set kind = case when is_first_month then 'first_month' else 'stock' end where kind is null;
alter table referral_rewards alter column kind set default 'stock';
alter table referral_rewards alter column kind set not null;

drop index if exists referral_rewards_unique;
create unique index if not exists referral_rewards_unique on public.referral_rewards (referrer_id, referred_id, reward_month, kind);
