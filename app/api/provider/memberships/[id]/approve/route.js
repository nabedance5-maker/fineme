// POST /api/provider/memberships/[id]/approve → 入会申込を承認し、実際の課金を開始する
// 店舗が申込内容（個人情報・本人確認書類・緊急連絡先）を確認した上で押す、入会手続き
// フローの最終ステップ（でお要望2026-09-15：「店舗側で承認・完了処理を行う」）。
//
// 請求は店舗の設定（lib/membership-cycle.js）で決める（でお指摘・でお要望 2026-10-27）：
// ・「◯月分を、前の月／その月／次の月の◯日に請求」（前払い・当月・後払い）、または入会日から1か月ごと
// ・入会した月（入会日〜月末）は、日割り／1か月分／無料
// 承認した日までに請求日が来ている月の分と入会金は、承認時に1枚の請求書でまとめて請求する（払えなければ入会を確定しない）。
// それより後の月は Stripe のサブスク（billing_cycle_anchor＝最初の請求日の9:00 日本時間）で毎月。最初の月が日割り・無料なら、その請求から差額を引く。
// 以前は「承認した日〜入会希望日の前日」を日割りで請求しており、入会前の日数まで払わせる誤りだった。
//
// 資金は店舗のStripe Connectアカウントへtransfer_data.destinationで送金する（紹介報酬送金と同じConnect基盤を流用）。
// Fineme決済手数料（lib/payment-fee.js：4.5%・Stripe手数料込み）を application_fee_percent で差し引き、残りが店舗へ。
//
// ロッカーを選んだお客様（でお要望2026-09-18：「ロッカー代を自動で一緒に課金したい」）は、
// 同じサブスクリプションにロッカー代を2つ目の明細として追加する。ロッカーの金額は店舗が
// いつでも変更できるため、Priceは都度price_dataでその場生成し古いPriceを参照しない
// （Productだけprovider_lockers.stripe_product_idに使い回す）。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { PAYMENT_FEE_PERCENT } from '@/lib/payment-fee';
import { planLockedResponse } from '@/lib/plan-features';
import { profileFromMembership, fillEmpty } from '@/lib/customer-profile';
import { ensureOptionProduct } from '@/lib/membership-changes';
import { grantPlanTickets } from '@/lib/membership-plan';
import { jstToday } from '@/lib/membership-cycle';
import { membershipReceipt } from '@/lib/membership-receipt';
import { planMembershipStart, startMembershipSubscription, BillingGuardError } from '@/lib/membership-billing-guard';
import { raiseBillingAlert } from '@/lib/membership-billing-sync';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, stripe_connect_id, stripe_connect_status, plan').eq('email', user.email).single();
  return data || null;
}

async function __POST(request, { params }) {
  const { id } = await params;
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'membership_enrollment'); if (locked) return locked; }

  if (!provider.stripe_connect_id || provider.stripe_connect_status !== 'active') {
    return Response.json({ error: '入金先のStripe Connect設定が完了していません。「Fineme利用契約」タブから設定してください' }, { status: 409 });
  }

  const { data: m } = await supabase.from('provider_memberships').select('*').eq('id', id).eq('provider_id', provider.id).single();
  if (!m) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (m.status !== 'pending_approval') return Response.json({ error: 'この申込は承認できる状態ではありません' }, { status: 409 });
  if (!m.stripe_customer_id || !m.stripe_payment_method_id) return Response.json({ error: 'お客様の支払い方法が未登録です' }, { status: 409 });

  const { data: plan } = await supabase.from('provider_membership_plans').select('*').eq('id', m.plan_id).single();
  if (!plan?.stripe_price_id) return Response.json({ error: 'プラン情報が見つかりません' }, { status: 409 });

  let locker = null;
  if (m.locker_id) {
    const { data: lockerRow } = await supabase.from('provider_lockers').select('id, name, monthly_fee, stripe_product_id').eq('id', m.locker_id).eq('provider_id', provider.id).single();
    if (!lockerRow) return Response.json({ error: '選択されたロッカーが見つかりません' }, { status: 409 });
    if (!lockerRow.monthly_fee) return Response.json({ error: '選択されたロッカーに金額が設定されていません。ロッカー管理タブで金額を設定してください' }, { status: 409 });
    // 二重契約防止（でお質問2026-09-18の調査で判明：入会フローのロッカー選択は
    // 従来provider_locker_contractsに一切反映されず、空きロッカー判定をすり抜けて
    // 同じロッカーが別のお客様と二重に契約されうる状態だった）。
    const { data: existingContract } = await supabase.from('provider_locker_contracts').select('id').eq('locker_id', m.locker_id).eq('status', 'active').limit(1).maybeSingle();
    if (existingContract) return Response.json({ error: 'このロッカーは既に別のお客様と契約中です。お客様に別のロッカーを選び直してもらうか、ロッカー管理タブで既存の契約を確認してください' }, { status: 409 });
    locker = lockerRow;
  }

  const { data: settings } = await supabase.from('provider_membership_settings').select('*').eq('provider_id', provider.id).maybeSingle();
  // 会員としての開始日：入会希望日。承認が入会希望日より後になったら承認した日（過ぎた日の分は請求しない）
  const today = jstToday();
  const startDate = m.enrollment_date && m.enrollment_date > today ? m.enrollment_date : today;

  try {
    // 保存済みのカードを今後の請求の既定支払い方法にする
    await stripe.customers.update(m.stripe_customer_id, { invoice_settings: { default_payment_method: m.stripe_payment_method_id } });

    const items = [{ price: plan.stripe_price_id }];
    if (locker) {
      let productId = locker.stripe_product_id;
      if (!productId) {
        const product = await stripe.products.create({ name: `ロッカー：${locker.name}` });
        productId = product.id;
        await supabase.from('provider_lockers').update({ stripe_product_id: productId }).eq('id', locker.id);
      }
      items.push({
        price_data: { currency: 'jpy', product: productId, unit_amount: locker.monthly_fee, recurring: { interval: 'month' } },
      });
    }

    // 入会時に選んだオプションも同じサブスクの明細に（でお要望 2026-10-19：hacomono差分 #5）
    const { data: options } = m.option_ids?.length
      ? await supabase.from('provider_membership_options').select('*').eq('provider_id', provider.id).in('id', m.option_ids)
      : { data: [] };
    const optionProduct = {};
    for (const o of options || []) {
      optionProduct[o.id] = await ensureOptionProduct(supabase, stripe, o);
      items.push({ price_data: { currency: 'jpy', product: optionProduct[o.id], unit_amount: o.monthly_price, recurring: { interval: 'month' } } });
    }
    // 入会時に使ったクーポン（割引）
    const { data: discount } = m.discount_id ? await supabase.from('provider_membership_discounts').select('*').eq('id', m.discount_id).maybeSingle() : { data: null };

    // お客様に見せたレシート（lib/membership-receipt.js）と、実際に請求する額を1円単位で照合してから課金する
    // （でお指摘 2026-10-27：クーポンの請求とレシートは絶対にずれてはいけない）。割引は Stripe のクーポンを使わず、
    // Fineme が計算して請求書に明細行で入れる（lib/membership-billing-guard.js）。食い違えば課金を始めずに止める。
    const receipt = membershipReceipt({ cycle: settings, enrollmentDate: m.enrollment_date || today, plan, options: options || [], locker, coupon: discount, today });
    const computed = planMembershipStart({ settings, startDate, today, plan, options: options || [], locker, discount, receipt });
    const start = computed.start;
    let started;
    try {
      started = await startMembershipSubscription(stripe, {
        plan, customerId: m.stripe_customer_id, paymentMethodId: m.stripe_payment_method_id,
        connectId: provider.stripe_connect_id, feePercent: PAYMENT_FEE_PERCENT,
        membershipId: m.id, providerId: provider.id, lockerId: locker?.id || '',
        subscriptionItems: items, discount, computed,
      });
    } catch (e) {
      if (e instanceof BillingGuardError) {
        await raiseBillingAlert(supabase, { providerId: provider.id, membershipId: m.id, kind: 'approval_blocked', problems: e.problems, expected: computed.immediateTotal });
        return Response.json({ error: `${e.message}。課金は始めていません（Finemeの運営に自動で知らせました）`, problems: e.problems }, { status: 409 });
      }
      if (e.payment) return Response.json({ error: e.message }, { status: 402 });
      throw e;
    }
    const subscription = started.subscription;

    if ((options || []).length) {
      await supabase.from('provider_membership_option_items').insert(options.map(o => ({
        provider_id: provider.id, membership_id: m.id, option_id: o.id, name: o.name, monthly_price: o.monthly_price,
        stripe_item_id: subscription.items.data.find(i => i.price?.product === optionProduct[o.id])?.id || null,
      })));
    }
    if (discount) await supabase.from('provider_membership_discounts').update({ used_count: (discount.used_count || 0) + 1 }).eq('id', discount.id);

    const { data: updated, error } = await supabase
      .from('provider_memberships')
      .update({
        status: 'active', stripe_subscription_id: subscription.id, approved_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        // 承認した時の請求の基準（あとでお店が設定を変えても、この会員の請求は変わらない）
        billing_start_date: startDate, billing_first_full_date: start.schedule.scheduled.due, billing_anchor_day: start.schedule.anchorDay,
        billing_mode: start.schedule.cycle.billing_mode, billing_month_offset: start.schedule.cycle.billing_month_offset,
        prorated_first_amount: start.schedule.partial?.amount ?? null,
        ...(discount ? { discount_applied_at: new Date().toISOString() } : {}),
        // 割引は Fineme が請求書に入れる。残り回数は承認後の定期の請求で数える（null＝ずっと）
        discount_managed: true, discount_remaining: computed.remainingForSubscription,
        discount_pending_item_id: started.pendingItemId, billing_expected: started.expected, approval_receipt: receipt,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // ロッカー契約台帳（provider_locker_contracts）に実際の契約行を作る（でお質問
    // 2026-09-18：「ロッカーを契約したら顧客情報に紐づいて表示されるようになってる？」。
    // これが無いとロッカー管理タブの契約一覧にも顧客情報ポップアップにも出てこない）。
    if (locker) {
      await supabase.from('provider_locker_contracts').insert({
        locker_id: locker.id,
        provider_id: provider.id,
        user_id: m.user_id,
        contractor_name: `${m.last_name || ''} ${m.first_name || ''}`.trim() || '（入会手続きより）',
        monthly_fee: locker.monthly_fee,
        status: 'active',
        membership_id: m.id,
      });
    }

    // プランで入会時に配る回数券（でお要望 2026-10-22）
    try { await grantPlanTickets(supabase, updated, plan, 'join'); } catch (e) { console.error('[memberships approve] tickets', e); }

    // 申込で入力してもらった内容を、顧客の基本情報に取り込む（空欄の項目だけ。店舗が入れた値は上書きしない）
    // でお要望（2026-10-16）：入会した時に入力してもらった情報を顧客情報内に入れておく。
    try {
      const fromApp = profileFromMembership(m);
      const { data: cur } = await supabase.from('provider_customer_profiles').select('*').eq('provider_id', provider.id).eq('user_id', m.user_id).maybeSingle();
      if (cur) {
        const merged = fillEmpty(cur, fromApp);
        const patch = Object.fromEntries(Object.keys(fromApp).filter(k => merged[k] !== cur[k]).map(k => [k, merged[k]]));
        if (Object.keys(patch).length) await supabase.from('provider_customer_profiles').update({ ...patch, updated_at: new Date().toISOString(), updated_by: 'オンライン入会' }).eq('id', cur.id);
      } else {
        await supabase.from('provider_customer_profiles').insert({ provider_id: provider.id, user_id: m.user_id, ...fromApp, updated_by: 'オンライン入会' });
      }
    } catch (e) { console.error('[memberships approve] profile', e); }

    return Response.json(updated);
  } catch (e) {
    console.error('[memberships approve]', e);
    return Response.json({ error: 'Stripeでの課金開始に失敗しました: ' + e.message }, { status: 500 });
  }
}

export const POST = withAudit(__POST);
