import { getSupabase } from '@/lib/supabase';

/**
 * GET /api/billing/referrals?provider_id=xxx
 *
 * provider_id を指定した場合: その掲載者が「営業パートナーとして」紹介した一覧
 *   （掲載者ダッシュボード用。掲載者自身がsales_partnersに登録済みの場合のみ結果を返す。
 *   未登録の場合は not_registered:true を返すので、呼び出し側は登録導線を出す）
 * provider_id を省略した場合: 全営業パートナーの紹介関係（管理者向け）
 *
 * 紹介者の身元は sales_partners（掲載者から独立した営業パートナーの登録単位）。
 * providers.referred_by（紹介された側に入っている、紹介者のreferral_code）と
 * sales_partners.referral_code を突き合わせて紹介関係を取得する
 * （でお方針2026-10-02：「掲載者＝営業パートナー」の自動一体化を廃止・
 *  掲載者も希望すれば別途sales_partnersへ登録する方式に変更。報酬率・計算ロジックは不変）。
 * referral_rewards テーブルがあれば過去の支払い実績も返す。
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get('provider_id');

  const sb = getSupabase();

  // ── 対象の紹介者（営業パートナー）情報を取得 ────────────────────
  let referrerReferralCode = null;
  let referrerId = null; // sales_partners.id（referral_rewards.referrer_idと対応）

  if (providerId) {
    const { data: partner, error: refErr } = await sb
      .from('sales_partners')
      .select('id, referral_code, status')
      .eq('provider_id', providerId)
      .eq('status', 'active')
      .maybeSingle();

    if (refErr) {
      return Response.json({ error: '紹介情報の取得に失敗しました' }, { status: 500 });
    }
    if (!partner) {
      // この掲載者はまだ営業パートナーとして登録していない
      return Response.json({ not_registered: true, referrals: [], summary: null });
    }
    referrerReferralCode = partner.referral_code;
    referrerId = partner.id;
  }

  // ── 紹介された掲載者一覧を取得 ────────────────────────────────
  // referred_by = 紹介者の referral_code の掲載者を取得
  let referredQuery = sb
    .from('providers')
    .select('id, name, slug, referred_by, billing_started, plan, created_at')
    .not('referred_by', 'is', null);

  if (referrerReferralCode) {
    referredQuery = referredQuery.eq('referred_by', referrerReferralCode);
  }

  const { data: referredProviders, error: rpErr } = await referredQuery;

  if (rpErr) {
    return Response.json({ error: '紹介一覧の取得に失敗しました' }, { status: 500 });
  }

  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  // ── referral_rewards から過去の支払い実績を取得（テーブルが存在しない場合は空で続行） ──
  let rewardsMap = {}; // key: referred_id → { total_paid, pending_amount }

  try {
    let rewardsQuery = sb
      .from('referral_rewards')
      .select('referrer_id, referred_id, reward_month, amount, status');

    if (referrerId) {
      rewardsQuery = rewardsQuery.eq('referrer_id', referrerId);
    }

    const { data: rewardsData, error: rwErr } = await rewardsQuery;

    if (!rwErr && rewardsData) {
      rewardsData.forEach(rw => {
        if (!rewardsMap[rw.referred_id]) {
          rewardsMap[rw.referred_id] = { total_paid: 0, pending_amount: 0 };
        }
        if (rw.status === 'paid') {
          rewardsMap[rw.referred_id].total_paid += rw.amount;
        } else if (rw.status === 'pending') {
          rewardsMap[rw.referred_id].pending_amount += rw.amount;
        }
      });
    }
  } catch {
    // referral_rewards テーブルが存在しない場合はスキップ
  }

  // ── 紹介一覧を整形 ────────────────────────────────────────────
  const referrals = (referredProviders || []).map(p => {
    const isActive = !!p.billing_started;
    const rwData = rewardsMap[p.id] || { total_paid: 0, pending_amount: 0 };

    // 課金開始月から現在までの月数を計算（累計見込み報酬）
    let estimatedTotal = 0;
    if (isActive && p.billing_started) {
      const startDate = new Date(p.billing_started);
      const now = new Date();
      const months =
        (now.getFullYear() - startDate.getFullYear()) * 12 +
        (now.getMonth() - startDate.getMonth()) +
        1;
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

  return Response.json({ referrals, summary });
}
