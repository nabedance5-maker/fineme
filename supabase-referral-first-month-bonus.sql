-- 紹介報酬の内訳を記録するためのカラム追加
-- ストック型紹介報酬の正しい仕様（でお 2026-09-02 再確認）：
--   ①初月：紹介した掲載店舗の初回課金額の90%を成果報酬としてキャッシュバック
--   ②継続：その掲載店舗が掲載を続ける限り、1社につき月¥500をストック報酬として支払う
-- app/api/stripe/webhook/route.js の recordReferralReward() が①②を判定して amount を計算する。
-- is_first_month で「①(90%成果報酬)」か「②(¥500ストック)」かを区別して記録する。
alter table public.referral_rewards
  add column if not exists is_first_month boolean not null default false;
