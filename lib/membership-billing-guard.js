// 月会費の割引（クーポン）と請求額の照合（でお指摘 2026-10-27：「クーポンの請求とレシートは絶対にずれてはいけない」）。
//
// ずれないための作り：
//  1. Stripe のクーポン機能は使わない。割引額は Fineme が計算し（lib/membership-receipt.js と同じ couponOff）、
//     請求書に「割引：◯◯」の明細行として入れる。承認時の請求は作る時に入れ、定期の請求は「次の請求に入れる明細」を
//     サブスクに付けておく（前の請求が払われたら、次の月の分を付ける）。入会金・調整の行には掛けない。
//  2. 承認する前に、実際の請求書（承認時の分は下書き、定期の最初の分は見積もり）とレシートを1円単位で照合し、違えば課金を始めない。
//  3. 毎月、次の請求を見積もりで点検し、払われた請求も点検する。違えば運営と店舗に知らせる。
//
// Stripe・DB に依存する所は引数で受け取る（scripts/test-membership-billing.mjs から Stripe のテスト環境で同じ処理を流すため）。
import { couponOff } from './membership-receipt.js';
import { stripeStart, tsToJst } from './membership-cycle.js';

export const DISCOUNT_KIND = 'membership_discount';
const md = s => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;

export class BillingGuardError extends Error {
  constructor(message, problems = []) { super(message); this.problems = problems; }
}

export function couponTimesOf(d) {
  if (!d) return 0;
  if (d.duration === 'forever') return Infinity;
  if (d.duration === 'repeating') return Math.max(1, Number(d.months) || 1);
  return 1;
}

export const isDiscountLine = l => l?.metadata?.fineme_kind === DISCOUNT_KIND || /^割引：/.test(l?.description || '');

// サブスクの月額（明細の合計）
export function subscriptionMonthly(sub) {
  return (sub?.items?.data || []).reduce((t, i) => t + (i.price?.unit_amount || 0) * (i.quantity || 1), 0);
}

function discountItemParams({ customerId, membershipId, discount, off, label }) {
  return {
    customer: customerId, amount: -off, currency: 'jpy',
    description: `割引：${discount.name}${label ? `（${label}）` : ''}`,
    metadata: { fineme_kind: DISCOUNT_KIND, fineme_membership_id: membershipId, fineme_discount_id: discount.id || '' },
  };
}

// 請求書（下書き・見積もり・確定後のどれでも）の点検。
//  - Stripe 側の割引（クーポン）が掛かっていない
//  - Fineme の割引の行が 0行 か 1行で、合計が expectedDiscount（円・正の数）
//  - 合計が明細の合計と同じ（見えない調整が無い）
//  - expectedTotal を渡したら、合計がそれと同じ
export function inspectInvoice(inv, { expectedDiscount = 0, expectedTotal = null } = {}) {
  const lines = inv?.lines?.data || [];
  const problems = [];
  const stripeDisc = (inv?.total_discount_amounts || []).reduce((t, d) => t + (d.amount || 0), 0);
  if (stripeDisc) problems.push(`Stripeのクーポンで${stripeDisc}円の割引が掛かっています`);
  const dl = lines.filter(isDiscountLine);
  const dsum = -dl.reduce((t, l) => t + (l.amount || 0), 0);
  if (dl.length > 1) problems.push(`割引の行が${dl.length}行あります`);
  if (dsum !== expectedDiscount) problems.push(`割引が${dsum}円です（予定は${expectedDiscount}円）`);
  const hasMore = inv?.lines?.has_more;
  const lineSum = lines.reduce((t, l) => t + (l.amount || 0), 0);
  const total = typeof inv?.total === 'number' ? inv.total : inv?.amount_due;
  if (!hasMore && total !== lineSum) problems.push(`合計${total}円が明細の合計${lineSum}円と合いません`);
  if (expectedTotal != null && total !== expectedTotal) problems.push(`請求額が${total}円です（予定は${expectedTotal}円）`);
  return { ok: problems.length === 0, problems, total, discount: dsum };
}

// 承認時の請求とサブスクの組み立て（金額の計算だけ。Stripe には触らない）。レシートと食い違えば止める。
// plan: { name, monthly_price, initial_fee } / options・locker: 月額 / discount: 割引の行 / receipt: membershipReceipt の結果
export function planMembershipStart({ settings, startDate, today, plan, options = [], locker = null, discount = null, receipt }) {
  const monthlyTotal = (Number(plan.monthly_price) || 0) + (Number(locker?.monthly_fee) || 0) + options.reduce((t, o) => t + (Number(o.monthly_price) || 0), 0);
  const start = stripeStart(settings, { startDate, monthlyTotal, today });
  const immediateLines = [];
  if (Number(plan.initial_fee) > 0) immediateLines.push({ amount: Number(plan.initial_fee), description: `入会金：${plan.name}` });
  let left = couponTimesOf(discount);
  for (const mc of start.immediate) {
    immediateLines.push({ amount: mc.amount, description: `月会費 ${mc.label}（${md(mc.from)}〜${md(mc.to)}）` });
    if (discount && left > 0) {
      const off = couponOff(discount, mc.amount);
      if (off > 0) immediateLines.push({ amount: -off, description: `割引：${discount.name}（${mc.label}）`, discount: true });
      left -= 1;
    }
  }
  const immediateTotal = immediateLines.reduce((t, l) => t + l.amount, 0);
  const sch = start.schedule.scheduled;
  // 承認後に数える割引の残り回数（定期の最初の請求を含む。払われるたびに1減らす）
  const leftForSub = left;
  // 定期の請求（レシートに並べる分）：最初は 1か月分（サブスクの明細）− 調整（入会した月の日割り・無料）、以後は1か月分。それぞれから割引
  const scheduled = [];
  for (const mo of start.schedule.months.filter(x => !x.immediate)) {
    const base = scheduled.length === 0 ? monthlyTotal - start.adjust : mo.amount;
    let off = 0;
    if (discount && left > 0 && base > 0) { off = couponOff(discount, base); left -= 1; }
    scheduled.push({ due: mo.due, label: mo.label, base, off, total: base - off });
  }
  const firstOff = scheduled[0].off;
  const firstTotal = scheduled[0].total;
  const firstBase = scheduled[0].base;
  // その後の毎月
  const afterOff = discount && left > 0 ? couponOff(discount, monthlyTotal) : 0;
  const afterTotal = monthlyTotal - afterOff;

  // レシート（お客様に見せたもの）と1円単位で照合
  const problems = [];
  if (receipt) {
    const ap = receipt.payments.find(g => g.key === 'approval');
    if ((ap?.total || 0) !== immediateTotal) problems.push(`承認時の請求：計算${immediateTotal}円・レシート${ap?.total || 0}円`);
    for (const sc of scheduled) {
      const sp = receipt.payments.find(g => g.key !== 'approval' && g.date === sc.due);
      if (!sp) problems.push(`レシートに${md(sc.due)}の請求がありません`);
      else if (sp.total !== sc.total) problems.push(`${md(sc.due)}の請求：計算${sc.total}円・レシート${sp.total}円`);
    }
    if (receipt.after.amount !== afterTotal) problems.push(`その後の毎月：計算${afterTotal}円・レシート${receipt.after.amount}円`);
  }
  return {
    monthlyTotal, start, immediateLines, immediateTotal,
    first: { due: sch.due, label: sch.label, base: firstBase, off: firstOff, total: firstTotal },
    scheduled,
    // 承認後に数える割引の残り回数（定期の最初の請求を含む。払われるたびに1減らす）。null＝ずっと
    remainingForSubscription: !discount || leftForSub <= 0 ? 0 : leftForSub === Infinity ? null : leftForSub,
    after: { off: afterOff, total: afterTotal },
    problems,
  };
}

// 承認：①承認時の請求書を下書きで作って照合 ②サブスクを作って次の請求を見積もりで照合 ③両方合っていれば承認時の請求を確定して決済。
// どこかで食い違えば、作ったものを取り消して BillingGuardError を投げる（課金は始まらない）。決済できなければ PaymentError。
export async function startMembershipSubscription(stripe, {
  plan, customerId, paymentMethodId, connectId = null, feePercent = 0, membershipId, providerId, lockerId = '',
  subscriptionItems, discount = null, computed, idempotencyKey = null,
}) {
  if (computed.problems.length) throw new BillingGuardError('お客様に見せた金額と、請求する金額の計算が合いません', computed.problems);
  const transfer = connectId ? { transfer_data: { destination: connectId } } : {};
  let immediateInvoice = null;
  const cleanup = async ({ sub, items = [] } = {}) => {
    for (const id of items) { try { await stripe.invoiceItems.del(id); } catch { /* 請求書に入っていたら消せない */ } }
    if (sub) { try { await stripe.subscriptions.cancel(sub.id, { prorate: false }); } catch {} }
    if (immediateInvoice) { try { await stripe.invoices.del(immediateInvoice.id); } catch { try { await stripe.invoices.voidInvoice(immediateInvoice.id); } catch {} } }
  };

  // ① 承認時の請求（下書き）
  if (computed.immediateTotal > 0) {
    immediateInvoice = await stripe.invoices.create({
      customer: customerId, collection_method: 'charge_automatically', auto_advance: false,
      pending_invoice_items_behavior: 'exclude', default_payment_method: paymentMethodId, ...transfer,
      ...(connectId ? { application_fee_amount: Math.round(computed.immediateTotal * feePercent / 100) } : {}),
      description: '入会時のお支払い',
      metadata: { fineme_membership_id: membershipId, fineme_provider_id: providerId, fineme_kind: 'membership_initial' },
    }, idempotencyKey ? { idempotencyKey: `${idempotencyKey}-inv` } : undefined);
    for (const l of computed.immediateLines) {
      await stripe.invoiceItems.create({
        customer: customerId, invoice: immediateInvoice.id, amount: l.amount, currency: 'jpy', description: l.description,
        ...(l.discount ? { metadata: { fineme_kind: DISCOUNT_KIND, fineme_membership_id: membershipId, fineme_discount_id: discount?.id || '' } } : {}),
      });
    }
    const draft = await stripe.invoices.retrieve(immediateInvoice.id);
    const expectedDiscount = -computed.immediateLines.filter(l => l.discount).reduce((t, l) => t + l.amount, 0);
    const chk = inspectInvoice(draft, { expectedDiscount, expectedTotal: computed.immediateTotal });
    if (!chk.ok) { await cleanup(); throw new BillingGuardError('承認時の請求額が、お客様に見せた金額と合いません', chk.problems); }
  }

  // ② サブスク（クーポンは付けない）と、定期の最初の請求に入れる明細
  let sub = null;
  const created = [];
  try {
    sub = await stripe.subscriptions.create({
      customer: customerId, items: subscriptionItems, default_payment_method: paymentMethodId, ...transfer,
      ...(connectId ? { application_fee_percent: feePercent } : {}),
      metadata: { fineme_membership_id: membershipId, fineme_provider_id: providerId, fineme_locker_id: lockerId || '' },
      ...computed.start.params,
    }, idempotencyKey ? { idempotencyKey: `${idempotencyKey}-sub` } : undefined);
    if (subscriptionMonthly(sub) !== computed.monthlyTotal) {
      throw new BillingGuardError('サブスクの月額が合いません', [`サブスク${subscriptionMonthly(sub)}円・計算${computed.monthlyTotal}円`]);
    }
    if (computed.start.adjust > 0) {
      const sch = computed.start.schedule;
      const it = await stripe.invoiceItems.create({
        customer: customerId, subscription: sub.id, amount: -computed.start.adjust, currency: 'jpy',
        description: `${sch.scheduled.label}は${sch.cycle.first_month === 'free' ? '無料' : `日割り（${sch.scheduled.days}日分）`}のため`,
        metadata: { fineme_kind: 'membership_adjust', fineme_membership_id: membershipId },
      });
      created.push(it.id);
    }
    let pendingItemId = null;
    if (computed.first.off > 0) {
      const it = await stripe.invoiceItems.create({ ...discountItemParams({ customerId, membershipId, discount, off: computed.first.off, label: computed.first.label }), subscription: sub.id });
      created.push(it.id);
      pendingItemId = it.id;
    }
    const preview = await stripe.invoices.createPreview({ subscription: sub.id });
    const chk = inspectInvoice(preview, { expectedDiscount: computed.first.off, expectedTotal: computed.first.total });
    if (!chk.ok) throw new BillingGuardError(`${md(computed.first.due)}の請求額（見積もり）が、お客様に見せた金額と合いません`, chk.problems);

    // ③ 承認時の請求を確定して決済
    if (immediateInvoice) {
      await stripe.invoices.finalizeInvoice(immediateInvoice.id);
      try {
        immediateInvoice = await stripe.invoices.pay(immediateInvoice.id);
      } catch (e) {
        try { await stripe.invoices.voidInvoice(immediateInvoice.id); } catch {}
        immediateInvoice = null;
        await cleanup({ sub, items: created });
        const err = new Error(`カードで決済できませんでした（${e?.raw?.message || e.message}）。お客様にカードを確かめてもらってください`);
        err.payment = true;
        throw err;
      }
    }
    return {
      subscription: sub, immediateInvoice, pendingItemId,
      expected: { total: chk.total, discount: chk.discount, due: computed.first.due, checked_at: new Date().toISOString() },
    };
  } catch (e) {
    if (!e.payment) await cleanup({ sub, items: created });
    throw e;
  }
}

// 承認後：次の請求に入れる割引の明細を付け直し、次の請求を見積もりで点検する。
// state: { subscriptionId, customerId, membershipId, discount, remaining（null＝ずっと）, pendingItemId, active }
// 返り値：{ pendingItemId, expected, check }（DB の更新は呼び出し側）
export async function prepareNextDiscount(stripe, state) {
  // まだ請求書に入っていない、前に付けた明細は消して作り直す（月額が変わっていることがあるため）
  if (state.pendingItemId) {
    try {
      const it = await stripe.invoiceItems.retrieve(state.pendingItemId);
      if (!it.invoice && !it.deleted) await stripe.invoiceItems.del(state.pendingItemId);
    } catch { /* もう無い */ }
  }
  let sub;
  try { sub = await stripe.subscriptions.retrieve(state.subscriptionId); } catch { return { pendingItemId: null, expected: null, check: null }; }
  if (!sub || ['canceled', 'incomplete_expired'].includes(sub.status)) return { pendingItemId: null, expected: null, check: null };
  let pendingItemId = null;
  let off = 0;
  const on = state.active && state.discount && (state.remaining == null || state.remaining > 0);
  if (on) {
    off = couponOff(state.discount, subscriptionMonthly(sub));
    if (off > 0) {
      const it = await stripe.invoiceItems.create({ ...discountItemParams({ customerId: state.customerId, membershipId: state.membershipId, discount: state.discount, off }), subscription: sub.id });
      pendingItemId = it.id;
    }
  }
  let preview = null;
  try { preview = await stripe.invoices.createPreview({ subscription: sub.id }); } catch { /* 次の請求が無い（退会予定の後など） */ }
  if (!preview) return { pendingItemId, expected: null, check: null };
  const check = inspectInvoice(preview, { expectedDiscount: off });
  return {
    pendingItemId,
    expected: { total: check.total, discount: off, due: tsToJst(preview.next_payment_attempt || preview.period_end || preview.created), checked_at: new Date().toISOString() },
    check,
  };
}

// 払われた請求の点検と、割引の残り回数。state: { remaining, expected（billing_expected） }
export function checkPaidInvoice(invoice, state) {
  const discountLines = (invoice?.lines?.data || []).filter(isDiscountLine);
  const used = -discountLines.reduce((t, l) => t + (l.amount || 0), 0);
  const exp = state.expected;
  const check = inspectInvoice(invoice, {
    expectedDiscount: exp ? exp.discount : used,
    expectedTotal: exp ? exp.total : null,
  });
  // 払われた額そのものも見る（見積もりの後に何か変わった時のため）
  if (exp && typeof invoice.amount_paid === 'number' && invoice.amount_paid !== exp.total && !check.problems.some(p => p.startsWith('請求額'))) {
    check.problems.push(`払われた額が${invoice.amount_paid}円です（予定は${exp.total}円）`);
    check.ok = false;
  }
  const remaining = used > 0 && state.remaining != null ? Math.max(0, state.remaining - 1) : state.remaining;
  return { check, used, remaining };
}
