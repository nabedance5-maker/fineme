// 営業パートナーの紹介実績・報酬サマリーを計算する共通ロジック。
// app/api/billing/referrals（掲載者ダッシュボード用）と
// app/api/partner/[token]（営業パートナー専用管理画面用）の両方から呼ばれる
// （でお方針2026-10-02：営業パートナーは掲載者から独立した役割。表示ロジックを
// 一箇所にまとめ、報酬率・計算ロジックが両者でズレないようにする）。
//
// referrerReferralCode / referrerId（sales_partners.id）が null の場合は
// 全営業パートナーぶんの紹介関係を返す（admin向け）。
export async function getReferralSummary(sb, { referrerReferralCode = null, referrerId = null } = {}) {
  // ── 紹介された掲載者一覧を取得（referred_by = 紹介者のreferral_code） ──
  let referredQuery = sb
    .from('providers')
    .select('id, name, slug, referred_by, billing_started, plan, created_at')
    .not('referred_by', 'is', null);

  if (referrerReferralCode) {
    referredQuery = referredQuery.eq('referred_by', referrerReferralCode);
  }

  const { data: referredProviders, error: rpErr } = await referredQuery;
  if (rpErr) throw new Error('紹介一覧の取得に失敗しました');

  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  // ── referral_rewards から過去の支払い実績を取得（テーブルが存在しない場合は空で続行） ──
  let rewardsMap = {}; // key: referred_id → { total_paid, pending_amount }
  try {
    let rewardsQuery = sb
      .from('referral_rewards')
      .select('referrer_id, referred_id, reward_month, amount, status');

    if (referrerId) rewardsQuery = rewardsQuery.eq('referrer_id', referrerId);

    const { data: rewardsData, error: rwErr } = await rewardsQuery;
    if (!rwErr && rewardsData) {
      rewardsData.forEach(rw => {
        if (!rewardsMap[rw.referred_id]) rewardsMap[rw.referred_id] = { total_paid: 0, pending_amount: 0 };
        if (rw.status === 'paid') rewardsMap[rw.referred_id].total_paid += rw.amount;
        else if (rw.status === 'pending') rewardsMap[rw.referred_id].pending_amount += rw.amount;
      });
    }
  } catch {
    // referral_rewards テーブルが存在しない場合はスキップ
  }

  // ── 紹介一覧を整形 ────────────────────────────────────────────
  const referrals = (referredProviders || []).map(p => {
    const isActive = !!p.billing_started;
    const rwData = rewardsMap[p.id] || { total_paid: 0, pending_amount: 0 };

    // 課金開始月から現在までの月数を計算（累計見込み報酬。実績の正確な内訳は
    // referral_rewards側・ここはrewardsが無い場合の目安表示）
    let estimatedTotal = 0;
    if (isActive && p.billing_started) {
      const startDate = new Date(p.billing_started);
      const now = new Date();
      const months = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1;
      estimatedTotal = Math.max(0, months) * 500;
    }

    const totalEarned = rwData.total_paid > 0 ? rwData.total_paid : estimatedTotal;

    return {
      referred_id: p.id,
      referred_name: p.name,
      referred_slug: p.slug,
      billing_started: p.billing_started || null,
      monthly_reward: 500,
      status: isActive ? 'active' : 'inactive',
      total_earned: totalEarned,
    };
  });

  // ── サマリーを計算 ────────────────────────────────────────────
  const activeCount = referrals.filter(r => r.status === 'active').length;
  const totalEarnedAllTime = referrals.reduce((sum, r) => sum + r.total_earned, 0);
  const pendingThisMonth = activeCount * 500;

  const summary = {
    total_referred: referrals.length,
    active_count: activeCount,
    total_earned_all_time: totalEarnedAllTime,
    pending_this_month: pendingThisMonth,
    current_month: currentMonth,
    referral_code: referrerReferralCode || null,
  };

  return { referrals, summary };
}
