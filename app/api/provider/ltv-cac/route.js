// GET /api/provider/ltv-cac → 店舗単位のLTV・CAC概算（認証済み）
// 店舗SaaS実装仕様書 SAAS-041・要件を一部変更して実装。
//
// 元仕様は「メニュー別」の集計を想定していたが、来店記録(reservations)が
// どの体験メニュー(provider_experience_menus)に対応するか紐づけるカラムが無く、
// 正確なメニュー別集計ができない状態だった。誤った数字を経営判断材料として
// 出す方がリスクが大きいため、店舗単位（全体）の概算にスコープを縮小した。
//
// CACの元仕様は「広告費+掲載費+紹介報酬」だったが、referral_rewardsは
// 店舗が他の店舗を紹介した時の報酬であり、顧客獲得コストではないため含めない。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { PLANS } from '@/lib/stripe-plans';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: provider } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: settings } = await supabase
    .from('provider_ltv_cac_settings')
    .select('monthly_ad_cost, gross_margin_pct')
    .eq('provider_id', provider.id)
    .maybeSingle();
  const monthlyAdCost = settings?.monthly_ad_cost ?? 0;
  const grossMarginPct = settings?.gross_margin_pct ?? 70;
  const planAmount = PLANS[provider.plan]?.amount ?? 0;

  const { data: visited } = await supabase
    .from('reservations')
    .select('user_id, user_contact, price, reserved_date')
    .eq('provider_id', provider.id)
    .eq('status', 'visited');

  if (!visited?.length) {
    return Response.json({ hasData: false, monthlyAdCost, grossMarginPct, planAmount });
  }

  // 識別子はuser_idがあればそれ、無ければ連絡先で代用（ゲスト予約対応）
  const keyOf = (r) => r.user_id || r.user_contact;
  const byCustomer = {};
  visited.forEach(r => {
    const key = keyOf(r);
    if (!key) return;
    (byCustomer[key] = byCustomer[key] || []).push(r);
  });
  const customers = Object.values(byCustomer);
  const totalVisits = visited.length;
  const totalSpend = visited.reduce((s, r) => s + (r.price || 0), 0);
  const avgSpend = totalVisits ? Math.round(totalSpend / totalVisits) : 0;
  const avgRepeatVisits = customers.length ? Math.round((totalVisits / customers.length) * 10) / 10 : 0;

  const grossMargin = grossMarginPct / 100;
  const ltv = Math.round(avgRepeatVisits * avgSpend * grossMargin);

  // 直近12ヶ月に初来店した顧客数（CACの「新規来店数」）
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const newCustomers = customers.filter(list => {
    const firstDate = list.reduce((min, r) => (!min || r.reserved_date < min) ? r.reserved_date : min, null);
    return firstDate && new Date(firstDate) >= oneYearAgo;
  }).length;

  const annualCost = (monthlyAdCost + planAmount) * 12;
  const cac = newCustomers ? Math.round(annualCost / newCustomers) : null;
  const grossProfitPerVisit = Math.round(avgSpend * grossMargin);
  const paybackVisits = (cac && grossProfitPerVisit) ? Math.round((cac / grossProfitPerVisit) * 10) / 10 : null;

  return Response.json({
    hasData: true,
    customerCount: customers.length,
    totalVisits,
    avgSpend,
    avgRepeatVisits,
    ltv,
    newCustomersLast12Months: newCustomers,
    annualCost,
    cac,
    paybackVisits,
    monthlyAdCost,
    grossMarginPct,
    planAmount,
  });
}
