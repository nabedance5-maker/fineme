import { PLANS } from '@/lib/stripe-plans';

// 営業パートナーの紹介実績・報酬サマリーを計算する共通ロジック。
// app/api/billing/referrals（掲載者ダッシュボード用）と
// app/api/partner/[token]（営業パートナー専用管理画面用）の両方から呼ばれる
// （でお方針2026-10-02：営業パートナーは掲載者から独立した役割。表示ロジックを
// 一箇所にまとめ、報酬率・計算ロジックが両者でズレないようにする）。
//
// 金額の考え方（lib/collaborator-rewards.js と同じ仕様）：
//   初月 … 紹介した店舗が最初に支払った月額掲載料（税抜）の90%
//   継続 … 紹介した店舗1社につき月¥500
// 実際に発生した報酬は referral_rewards（Stripeの支払いごとに記録）が正。
// 累計はその記録の合計、今月の見込みは「今月すでに記録された報酬＋今月まだ支払いが来ていない課金中の店舗の見込み」。
//
// referrerReferralCode / referrerId（sales_partners.id）が null の場合は
// 全営業パートナーぶんの紹介関係を返す（admin向け）。
const FIRST_MONTH_RATE = 0.9;
const STOCK_REWARD_YEN = 500;
const TAX_RATE = 1.1;

// 課金中の店舗が、今月まだ報酬を記録していない時の見込み額。
// すでに報酬の記録がある店舗は継続（¥500）、まだ一度も無い店舗は初月（プランの税抜額の90%）。
function expectedRewardYen(plan, hasAnyReward) {
  if (hasAnyReward) return STOCK_REWARD_YEN;
  const amount = PLANS[plan]?.amount;
  if (!amount) return STOCK_REWARD_YEN;
  return Math.floor(Math.round(amount / TAX_RATE) * FIRST_MONTH_RATE);
}

export async function getReferralSummary(sb, { referrerReferralCode = null, referrerId = null } = {}) {
  // ── 紹介された掲載者一覧を取得（referred_by = 紹介者のreferral_code） ──
  let referredQuery = sb
    .from('providers')
    .select('id, name, slug, referred_by, billing_started, billing_status, plan, created_at')
    .not('referred_by', 'is', null);

  if (referrerReferralCode) {
    referredQuery = referredQuery.eq('referred_by', referrerReferralCode);
  }

  const { data: referredProviders, error: rpErr } = await referredQuery;
  if (rpErr) throw new Error('紹介一覧の取得に失敗しました');

  const currentMonth = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7); // 'YYYY-MM'（日本時間）

  // ── referral_rewards から、実際に発生した報酬を取得（テーブルが存在しない場合は空で続行） ──
  // key: referred_id → { total, paid, pending, first_month, this_month, count }
  const rewardsMap = {};
  try {
    let rewardsQuery = sb
      .from('referral_rewards')
      .select('referrer_id, referred_id, reward_month, amount, status, is_first_month');

    if (referrerId) rewardsQuery = rewardsQuery.eq('referrer_id', referrerId);

    const { data: rewardsData, error: rwErr } = await rewardsQuery;
    if (!rwErr && rewardsData) {
      rewardsData.forEach(rw => {
        if (rw.status === 'cancelled') return;
        const e = rewardsMap[rw.referred_id] || (rewardsMap[rw.referred_id] = { total: 0, paid: 0, pending: 0, first_month: 0, this_month: 0, count: 0 });
        e.total += rw.amount;
        e.count += 1;
        if (rw.status === 'paid') e.paid += rw.amount; else e.pending += rw.amount;
        if (rw.is_first_month) e.first_month += rw.amount;
        if (rw.reward_month === currentMonth) e.this_month += rw.amount;
      });
    }
  } catch {
    // referral_rewards テーブルが存在しない場合はスキップ
  }

  // ── 紹介一覧を整形 ────────────────────────────────────────────
  const referrals = (referredProviders || []).map(p => {
    const rw = rewardsMap[p.id] || { total: 0, paid: 0, pending: 0, first_month: 0, this_month: 0, count: 0 };
    // 課金中＝課金が始まっていて、解約・無料に戻っていない
    const isActive = !!p.billing_started && p.billing_status !== 'cancelled' && p.billing_status !== 'free';

    // 今月：記録があればその額、無ければ（課金中のときだけ）見込み額。
    const thisMonthRecorded = rw.this_month > 0;
    const thisMonth = thisMonthRecorded ? rw.this_month : (isActive ? expectedRewardYen(p.plan, rw.count > 0) : 0);

    return {
      referred_id: p.id,
      referred_name: p.name,
      referred_slug: p.slug,
      billing_started: p.billing_started || null,
      monthly_reward: STOCK_REWARD_YEN,
      first_month_reward: rw.first_month,   // 初月に発生した報酬（まだ記録が無ければ0）
      this_month_reward: thisMonth,         // 今月の報酬（記録済み or 見込み）
      this_month_recorded: thisMonthRecorded,
      status: isActive ? 'active' : 'inactive',
      total_earned: rw.total,               // 記録された報酬の合計（支払済み＋未払い）
      total_paid: rw.paid,
    };
  });

  // ── サマリーを計算 ────────────────────────────────────────────
  const activeCount = referrals.filter(r => r.status === 'active').length;
  const totalEarnedAllTime = referrals.reduce((sum, r) => sum + r.total_earned, 0);
  const totalPaid = referrals.reduce((sum, r) => sum + r.total_paid, 0);
  const pendingThisMonth = referrals.reduce((sum, r) => sum + r.this_month_reward, 0);

  const summary = {
    total_referred: referrals.length,
    active_count: activeCount,
    total_earned_all_time: totalEarnedAllTime,
    total_paid: totalPaid,
    pending_this_month: pendingThisMonth,
    current_month: currentMonth,
    referral_code: referrerReferralCode || null,
  };

  return { referrals, summary };
}
