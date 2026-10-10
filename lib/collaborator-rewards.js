// 掲載料の受領記録と、紹介報酬・協業者報酬の計算（Stripe webhookの invoice.payment_succeeded から呼ぶ）。
//
// 仕様の出典：業務委託契約書（協業者）第4条、master.md §4-4、
// memory project_referral_reward_structure。
//
//  一般の営業パートナー（referral_rewards に記録）
//    初月 … 紹介した店舗の初回の受領額(税抜)の90%
//    継続 … 紹介した店舗1社につき月¥500
//  協業者（sales_partners.is_collaborator = true・collaborator_rewards に記録）
//    override    … 掲載2ヶ月目以降の全掲載者について、受領額(税抜)の10%（紹介の有無を問わない）
//    first_month … 自分が紹介した店舗の初月は、受領額(税抜)の90%（overrideとは別枠）
//    一般の継続¥500は付かない（overrideに包含）
//    自店舗（sales_partners.provider_id）と excluded_provider_ids は計算対象外

const FIRST_MONTH_RATE = 0.9;
const STOCK_REWARD_YEN = 500;

// 純粋関数：1回の受領に対して発生する報酬行を返す（DBに触らない・テストしやすい）。
export function computeRewardRows({ isFirstPayment, amountExclTax, providerId, referredBy, partners }) {
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
        amount: isFirstPayment ? Math.floor(amountExclTax * FIRST_MONTH_RATE) : STOCK_REWARD_YEN,
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
      status: 'pending',
    }, { onConflict: 'referrer_id,referred_id,reward_month', ignoreDuplicates: true });
  }

  return { paymentId: payment.id, isFirstPayment, collaborator: rows.collaborator.length, standard: !!rows.standard };
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
