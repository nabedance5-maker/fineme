// POST /api/stripe/provider-subscribe { plan, agree_terms, return_to? }
// まだ契約していないお店が、プランを選び利用規約に同意して、月額の支払い（Stripe Checkout）に進む。
// 同意はここで記録する（同意していないと支払いに進めない。2026-10-30）。
// 払われると webhook が billing_status と plan を書き、管理画面の機能が使えるようになる。
import { getSupabase } from '@/lib/supabase';
import Stripe from 'stripe';
import { PLANS } from '@/lib/stripe-plans';
import { contractActive, specialActive } from '@/lib/provider-contract';
import { PROVIDER_TERMS_VERSION } from '@/lib/terms-version';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripe は未設定です' }, { status: 503 });

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = getSupabase();
    const { data: { user } } = await db.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan = 'A', agree_terms, return_to } = await request.json();
    const planConfig = PLANS[plan];
    if (!planConfig) return Response.json({ error: '無効なプランです' }, { status: 400 });

    // 掲載者情報を取得
    const { data: provider } = await db
      .from('providers')
      .select('id, plan, stripe_customer_id, billing_status, referral_code, monitor_until, special_until')
      .eq('email', user.email)
      .single();

    if (!provider) return Response.json({ error: '契約者情報が見つかりません' }, { status: 404 });
    // 特例無料のお試し（期限つき・2026-11-26）は、期間中でも申し込める（課金は期限が終わった次の瞬間から）。期限の無い特例無料は申し込み不要
    const specialTrial = provider.plan === 'special' && !!provider.special_until;
    if (provider.plan === 'special' && !specialTrial) {
      return Response.json({ error: '特例無料のアカウントのため、お支払いは不要です' }, { status: 409 });
    }
    // 無料モニター中（2026-11-16 渡邉判断）：期間中でも申し込める。課金はモニター期間が終わった次の瞬間から（Stripe の無料期間で待つ）。
    // Stripe の trial_end は48時間以上先が必要なので、残りが48時間を切っている時は48時間後から（最大2日ほど無料が延びる）
    const freeUntil = provider.billing_status === 'monitor' && contractActive(provider) ? provider.monitor_until
      : specialTrial && specialActive(provider) ? provider.special_until : null;
    const monitorTrialEnd = freeUntil
      ? Math.max(Math.floor(new Date(freeUntil).getTime() / 1000) + 1, Math.floor(Date.now() / 1000) + 48 * 3600 + 300)
      : null;
    if (!monitorTrialEnd && contractActive(provider)) {
      return Response.json({ error: 'すでに契約中です。プランの変更は「Fineme利用契約」からどうぞ。' }, { status: 409 });
    }
    if (agree_terms !== true) {
      return Response.json({ error: '利用規約をご確認のうえ、「同意する」にチェックを入れてください', code: 'terms_required' }, { status: 400 });
    }
    const { error: termsError } = await db.from('provider_terms_agreements')
      .upsert({ provider_id: provider.id, terms_version: PROVIDER_TERMS_VERSION }, { onConflict: 'provider_id,terms_version', ignoreDuplicates: true });
    if (termsError) return Response.json({ error: '同意の記録に失敗しました。もう一度お試しください' }, { status: 500 });

    let customerId = provider.stripe_customer_id;

    // Stripe Customer が未作成の場合は作成（旧登録フロー経由の掲載者対応）
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { fineme_provider_id: String(provider.id) },
      });
      customerId = customer.id;
      await db.from('providers').update({ stripe_customer_id: customerId }).eq('id', provider.id);
    }

    const back = return_to === 'dashboard' ? 'dashboard' : 'billing';
    // Stripe Checkout セッション作成（subscription モード・即時課金）
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: planConfig.price_id, quantity: 1 }],
      subscription_data: {
        metadata: { fineme_provider_id: String(provider.id), ...(monitorTrialEnd ? (specialTrial ? { fineme_special_trial: '1' } : { fineme_monitor: '1' }) : {}) },
        ...(monitorTrialEnd ? { trial_end: monitorTrialEnd } : {}),
      },
      success_url: `${BASE_URL}/provider/${back}?subscribed=1`,
      cancel_url:  `${BASE_URL}/provider/${back}?canceled=1`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[provider-subscribe]', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
