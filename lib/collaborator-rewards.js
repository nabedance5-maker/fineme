// 掲載料の受領記録と、紹介報酬・協業者報酬の計算（Stripe webhookの invoice.payment_succeeded から呼ぶ）。
//
// 仕様の出典：業務委託契約書（協業者）第4条、master.md §4-4、
// memory project_referral_reward_structure。
//
//  一般の営業パートナー（referral_rewards に記録。kindで種別を区別）
//    first_month … 紹介した店舗の初回の受領額(税込)の90%（2026-10-31 渡邉決定：募集LP・業務委託契約書の
//                  「月額5,000円なら4,500円」に揃える。協業者は別契約のため税抜のまま）
//    stock       … 紹介した店舗1社につき月¥500
//    upsell      … 紹介した店舗が契約後に上位プランへ変更した時、変更前後の月額差額(税込)の90%を
//                  変更があった月に加算（2026-11-08 渡邉決定・宮前様宛メール）。停止・ダウングレードは
//                  差し引かない。recordUpsellReward() から呼ぶ（/api/stripe/update-subscription）
//  協業者（sales_partners.is_collaborator = true・collaborator_rewards に記録）
//    override    … 掲載2ヶ月目以降の全掲載者について、受領額(税抜)の10%（紹介の有無を問わない）
//    first_month … 自分が紹介した店舗の初月は、受領額(税抜)の90%（overrideとは別枠）
//    一般の継続¥500・アップセル報酬は付かない（override側がプラン変更後の金額を自動で反映するため別枠不要）
//    自店舗（sales_partners.provider_id）と excluded_provider_ids は計算対象外

import { PLANS } from '@/lib/stripe-plans';

const FIRST_MONTH_RATE = 0.9;
const STOCK_REWARD_YEN = 500;
const UPSELL_RATE = 0.9;

// 純粋関数：1回の受領に対して発生する報酬行を返す（DBに触らない・テストしやすい）。
export function computeRewardRows({ isFirstPayment, amountExclTax, amountInclTax, providerId, referredBy, partners }) {
  const rows = { collaborator: [], standard: null };
  if (!(amountExclTax > 0)) return rows;

  for (const p of partners) {
    if (p.status !== 'active') continue;
    const isReferrer = !!referredBy && p.referral_code === referredBy;

    if (p.is_collaborator) {
      const excluded = p.provider_id === providerId || (p.excluded_provider_ids || []).includes(providerId);
      if (excluded) continue;
      if (!isFirstPayment) {
        const rate = Number(p.collaborator_rate) || 0.1;
        rows.collaborator.push({ partner_id: p.id, kind: 'override', rate, amount: Math.floor(amountExclTax * rate) });
      } else if (isReferrer) {
        rows.collaborator.push({ partner_id: p.id, kind: 'first_month', rate: FIRST_MONTH_RATE, amount: Math.floor(amountExclTax * FIRST_MONTH_RATE) });
      }
    } else if (isReferrer && p.provider_id !== providerId) {
      rows.standard = {
        partner_id: p.id,
        is_first_month: isFirstPayment,
        kind: isFirstPayment ? 'first_month' : 'stock',
        amount: isFirstPayment ? Math.floor((amountInclTax ?? amountExclTax) * FIRST_MONTH_RATE) : STOCK_REWARD_YEN,
      };
    }
  }
  return rows;
}

function jstMonth(unixSec) {
  const d = new Date((unixSec ? unixSec * 1000 : Date.now()) + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 7);
}

// Stripe invoice を受領として記録し、発生する報酬を記録する。同じ請求書の再配信では何も二重記録しない。
export async function recordPaymentAndRewards(sb, providerId, invoice) {
  const amountPaid = invoice.amount_paid || 0;
  if (amountPaid <= 0) return { skipped: 'zero_amount' };

  const tax = invoice.tax || 0;
  const amountExclTax = typeof invoice.total_excluding_tax === 'number'
    ? invoice.total_excluding_tax
    : Math.max(0, amountPaid - tax);
  const rewardMonth = jstMonth(invoice.status_transitions?.paid_at);

  const { data: existing } = await sb.from('provider_payments').select('id').eq('stripe_invoice_id', invoice.id).maybeSingle();
  if (existing) return { skipped: 'duplicate' };

  const { count: priorCount } = await sb.from('provider_payments')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', providerId).eq('refunded', false);
  const isFirstPayment = !priorCount;

  const { data: payment, error: payErr } = await sb.from('provider_payments').insert({
    provider_id: providerId,
    stripe_invoice_id: invoice.id,
    reward_month: rewardMonth,
    amount_paid: amountPaid,
    amount_excl_tax: amountExclTax,
    is_first_payment: isFirstPayment,
  }).select('id').single();
  if (payErr) {
    if (payErr.code === '23505') return { skipped: 'duplicate' }; // 同時配信
    throw payErr;
  }

  const [{ data: provider }, { data: partners }] = await Promise.all([
    sb.from('providers').select('id, referred_by').eq('id', providerId).single(),
    sb.from('sales_partners').select('id, referral_code, provider_id, status, is_collaborator, collaborator_rate, excluded_provider_ids'),
  ]);

  const rows = computeRewardRows({
    isFirstPayment,
    amountExclTax,
    amountInclTax: amountPaid,
    providerId,
    referredBy: provider?.referred_by || null,
    partners: partners || [],
  });

  if (rows.collaborator.length) {
    await sb.from('collaborator_rewards').upsert(
      rows.collaborator.map(r => ({
        ...r,
        provider_id: providerId,
        payment_id: payment.id,
        reward_month: rewardMonth,
        basis_amount: amountExclTax,
      })),
      { onConflict: 'partner_id,payment_id,kind', ignoreDuplicates: true },
    );
  }

  if (rows.standard) {
    await sb.from('referral_rewards').upsert({
      referrer_id: rows.standard.partner_id,
      referred_id: providerId,
      reward_month: rewardMonth,
      amount: rows.standard.amount,
      is_first_month: rows.standard.is_first_month,
      kind: rows.standard.kind,
      status: 'pending',
    }, { onConflict: 'referrer_id,referred_id,reward_month,kind', ignoreDuplicates: true });
  }

  return { paymentId: payment.id, isFirstPayment, collaborator: rows.collaborator.length, standard: !!rows.standard };
}

// プラン変更によるアップセル報酬（2026-11-08 渡邉決定）。
// /api/stripe/update-subscription（店舗が自分でプランを変更した時）から呼ぶ。
// 対象は一般の営業パートナー（紹介者）のみ。協業者は override（受領額の10%）がプラン変更後の
// 金額に自動で追従するため、ここでは対象にしない（二重払い防止）。
// 同じ月に複数回アップグレードした場合は、既存のupsell行があれば金額を積み上げる（上書きしない）。
export async function recordUpsellReward(sb, providerId, oldPlanKey, newPlanKey) {
  const oldAmount = PLANS[oldPlanKey]?.amount;
  const newAmount = PLANS[newPlanKey]?.amount;
  if (!oldAmount || !newAmount || newAmount <= oldAmount) return { skipped: 'not_an_upgrade' };

  const { data: provider } = await sb.from('providers').select('id, referred_by').eq('id', providerId).single();
  if (!provider?.referred_by) return { skipped: 'no_referrer' };

  const { data: partner } = await sb.from('sales_partners')
    .select('id, referral_code, provider_id, status, is_collaborator')
    .eq('referral_code', provider.referred_by)
    .eq('status', 'active')
    .maybeSingle();
  if (!partner || partner.is_collaborator || partner.provider_id === providerId) return { skipped: 'no_eligible_partner' };

  const amount = Math.floor((newAmount - oldAmount) * UPSELL_RATE);
  const rewardMonth = jstMonth();

  const { data: existing } = await sb.from('referral_rewards')
    .select('id, amount, status')
    .eq('referrer_id', partner.id).eq('referred_id', providerId).eq('reward_month', rewardMonth).eq('kind', 'upsell')
    .maybeSingle();

  if (existing) {
    await sb.from('referral_rewards').update({ amount: existing.amount + amount }).eq('id', existing.id);
    return { partnerId: partner.id, amount, accumulated: existing.amount + amount };
  }

  await sb.from('referral_rewards').insert({
    referrer_id: partner.id,
    referred_id: providerId,
    reward_month: rewardMonth,
    amount,
    is_first_month: false,
    kind: 'upsell',
    status: 'pending',
  });
  return { partnerId: partner.id, amount };
}

// 返金：受領記録を返金済みにし、未払いの協業者報酬を無効にする。支払済みの分は消さず、翌月以降の相殺用にメモを残す。
export async function recordRefund(sb, stripeInvoiceId) {
  const { data: payment } = await sb.from('provider_payments').select('id').eq('stripe_invoice_id', stripeInvoiceId).maybeSingle();
  if (!payment) return { skipped: 'unknown_invoice' };

  await sb.from('provider_payments').update({ refunded: true }).eq('id', payment.id);
  await sb.from('collaborator_rewards').update({ status: 'void', note: '返金により無効' })
    .eq('payment_id', payment.id).eq('status', 'pending');
  await sb.from('collaborator_rewards').update({ note: '返金あり：翌月以降の報酬と相殺' })
    .eq('payment_id', payment.id).eq('status', 'paid');
  return { refunded: true };
}

// お店の紹介者をあとから入れる・直す（2026-11-06 渡邉指摘：紹介コードの入れ忘れを運営が直せるように）。
// referred_by を変え、これまでの受領（provider_payments）から一般の紹介報酬を記録し直す。
// 前の紹介者のまだ払っていない報酬は取り消す。もう送金した報酬は消さない（note で知らせる）。
export async function setProviderReferrer(sb, providerId, code) {
  await sb.from('providers').update({ referred_by: code || null }).eq('id', providerId);
  const [{ data: payments }, { data: partners }, { data: rewards }] = await Promise.all([
    sb.from('provider_payments').select('id, reward_month, amount_paid, amount_excl_tax, is_first_payment, refunded').eq('provider_id', providerId).order('created_at', { ascending: true }),
    sb.from('sales_partners').select('id, referral_code, provider_id, status, is_collaborator, collaborator_rate, excluded_provider_ids'),
    sb.from('referral_rewards').select('id, referrer_id, status, amount').eq('referred_id', providerId),
  ]);
  const partner = code ? (partners || []).find(p => p.referral_code === code) : null;
  const stale = (rewards || []).filter(r => r.referrer_id !== partner?.id);
  const stalePending = stale.filter(r => r.status === 'pending');
  if (stalePending.length) await sb.from('referral_rewards').update({ status: 'cancelled' }).in('id', stalePending.map(r => r.id));
  // 一度取り消した紹介者に戻した時は、その人の取り消した報酬を未払いに戻す
  if (partner) await sb.from('referral_rewards').update({ status: 'pending' }).eq('referred_id', providerId).eq('referrer_id', partner.id).eq('status', 'cancelled');
  const notes = [];
  const stalePaid = stale.filter(r => r.status === 'paid');
  if (stalePaid.length) notes.push(`前の紹介者にはすでに ¥${stalePaid.reduce((a, r) => a + r.amount, 0).toLocaleString()} を送金済みです（取り消していません）`);

  let added = 0;
  for (const pay of (payments || []).filter(p => !p.refunded)) {
    const rows = computeRewardRows({
      isFirstPayment: pay.is_first_payment, amountExclTax: pay.amount_excl_tax, amountInclTax: pay.amount_paid,
      providerId, referredBy: code || null, partners: partners || [],
    });
    if (rows.standard) {
      const { data } = await sb.from('referral_rewards').upsert({
        referrer_id: rows.standard.partner_id, referred_id: providerId, reward_month: pay.reward_month,
        amount: rows.standard.amount, is_first_month: rows.standard.is_first_month, kind: rows.standard.kind, status: 'pending',
      }, { onConflict: 'referrer_id,referred_id,reward_month,kind', ignoreDuplicates: true }).select('id');
      added += data?.length || 0;
    }
    const firstMonth = rows.collaborator.filter(r => r.kind === 'first_month');
    if (firstMonth.length) {
      await sb.from('collaborator_rewards').upsert(firstMonth.map(r => ({ ...r, provider_id: providerId, payment_id: pay.id, reward_month: pay.reward_month, basis_amount: pay.amount_excl_tax })), { onConflict: 'partner_id,payment_id,kind', ignoreDuplicates: true });
    }
  }
  if (added) notes.push(`これまでのお支払いから、紹介報酬を${added}件記録しました（次の送金日に送られます）`);
  return { note: notes.join('\n') };
}
