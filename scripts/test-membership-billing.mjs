// 月会費の請求が、お客様に見せたレシートと1円単位で一致するかを、Stripe のテスト環境で確かめる（でお指摘 2026-10-27：
// 「クーポンの請求とレシートは絶対にずれてはいけない」）。
//
// 実行：STRIPE_TEST_SECRET_KEY=sk_test_... node --experimental-default-type=module scripts/test-membership-billing.mjs
//   （.env.local に STRIPE_TEST_SECRET_KEY を入れていれば `set -a; source .env.local; set +a` の後に実行）
//
// テストクロック（Stripe のテスト用の時計）で時間を進め、承認時の請求と、その後の毎月の請求を実際に作らせて、
// 金額をレシート（lib/membership-receipt.js）と比べる。本番の承認と同じ処理（lib/membership-billing-guard.js）を使い、
// webhook の代わりに「払われた請求の点検 → 次の月の割引の明細」を同じ関数で流す。本番のお金・本番のデータには触らない。
import Stripe from 'stripe';
import { membershipReceipt } from '../lib/membership-receipt.js';
import { planMembershipStart, startMembershipSubscription, prepareNextDiscount, checkPaidInvoice } from '../lib/membership-billing-guard.js';
import { addDays } from '../lib/membership-cycle.js';

const key = process.env.STRIPE_TEST_SECRET_KEY;
if (!key || !key.startsWith('sk_test_')) { console.error('STRIPE_TEST_SECRET_KEY（sk_test_ で始まるテスト用キー）が必要です'); process.exit(2); }
const stripe = new Stripe(key);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const tsOfJst = (date, hh = 10) => Math.floor(Date.parse(`${date}T${String(hh).padStart(2, '0')}:00:00+09:00`) / 1000);
const jstOf = ts => new Date(ts * 1000 + 9 * 3600000).toISOString().slice(0, 10);

async function advance(clock, date, hh = 12) {
  await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: tsOfJst(date, hh) });
  for (let i = 0; i < 120; i++) {
    const c = await stripe.testHelpers.testClocks.retrieve(clock.id);
    if (c.status === 'ready') return;
    if (c.status === 'internal_failure') throw new Error('test clock failure');
    await sleep(2000);
  }
  throw new Error('test clock timeout');
}

const CYCLES = {
  '毎月1日・その月・日割り': { billing_mode: 'fixed_day', billing_day: 1, billing_month_offset: 0, first_month: 'prorate' },
  '毎月25日・前の月（前払い）・1か月分': { billing_mode: 'fixed_day', billing_day: 25, billing_month_offset: -1, first_month: 'full', cancel_cutoff_day: 20 },
  '毎月1日・次の月（後払い）・無料': { billing_mode: 'fixed_day', billing_day: 1, billing_month_offset: 1, first_month: 'free' },
  '毎月15日・その月・日割り': { billing_mode: 'fixed_day', billing_day: 15, billing_month_offset: 0, first_month: 'prorate' },
  '入会日から1か月ごと': { billing_mode: 'anniversary', first_month: 'prorate' },
};
const COUPONS = {
  なし: null,
  '初回のみ1,000円引き': { id: 't-once', name: '初回', kind: 'amount', value: 1000, duration: 'once' },
  '3か月10%引き': { id: 't-rep', name: '3か月', kind: 'percent', value: 10, duration: 'repeating', months: 3 },
  'ずっと500円引き': { id: 't-ever', name: 'ずっと', kind: 'amount', value: 500, duration: 'forever' },
  '初回のみ20%引き': { id: 't-p20', name: '20%', kind: 'percent', value: 20, duration: 'once' },
};

// [請求の設定, クーポン, 入会金, 入会日（today からの日数）, ロッカー・オプション付き]
const CASES = [
  ['毎月1日・その月・日割り', '初回のみ1,000円引き', 5500, 10, true],
  ['毎月1日・その月・日割り', '3か月10%引き', 0, 0, false],
  ['毎月1日・その月・日割り', 'ずっと500円引き', 3300, 0, true],
  ['毎月25日・前の月（前払い）・1か月分', '初回のみ1,000円引き', 5500, 0, false],
  ['毎月25日・前の月（前払い）・1か月分', '3か月10%引き', 0, 12, true],
  ['毎月1日・次の月（後払い）・無料', '初回のみ20%引き', 5500, 0, false],
  ['毎月1日・次の月（後払い）・無料', 'ずっと500円引き', 0, 20, false],
  ['毎月15日・その月・日割り', '3か月10%引き', 3300, 3, true],
  ['毎月15日・その月・日割り', 'なし', 5500, 0, false],
  ['入会日から1か月ごと', '初回のみ1,000円引き', 5500, 0, false],
  ['入会日から1か月ごと', '3か月10%引き', 0, 7, true],
];

const TODAY = process.env.TEST_TODAY || '2026-11-05'; // テストクロックの「今日」（日本時間）

async function runCase([cycleName, couponName, initialFee, startIn, extras], n) {
  const settings = CYCLES[cycleName];
  const discount = COUPONS[couponName];
  const today = TODAY;
  const startDate = addDays(today, startIn);
  const title = `#${n} ${cycleName}／${couponName}／入会金${initialFee}／入会日${startDate}${extras ? '／ロッカー・オプション' : ''}`;
  const clock = await stripe.testHelpers.testClocks.create({ frozen_time: tsOfJst(today, 10), name: `fineme-test-${n}` });
  const fails = [];
  try {
    const customer = await stripe.customers.create({ test_clock: clock.id, name: 'テスト会員' });
    const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });
    const product = await stripe.products.create({ name: 'テストプラン' });
    const plan = { name: 'テストプラン', monthly_price: 8800, initial_fee: initialFee, stripe_price_id: (await stripe.prices.create({ product: product.id, currency: 'jpy', unit_amount: 8800, recurring: { interval: 'month' } })).id };
    const options = extras ? [{ name: 'タオル', monthly_price: 550 }] : [];
    const locker = extras ? { name: 'A-1', monthly_fee: 1100 } : null;
    const extraProduct = extras ? await stripe.products.create({ name: 'テスト追加' }) : null;
    const items = [{ price: plan.stripe_price_id },
      ...options.map(o => ({ price_data: { currency: 'jpy', product: extraProduct.id, unit_amount: o.monthly_price, recurring: { interval: 'month' } } })),
      ...(locker ? [{ price_data: { currency: 'jpy', product: extraProduct.id, unit_amount: locker.monthly_fee, recurring: { interval: 'month' } } }] : [])];

    const receipt = membershipReceipt({ cycle: settings, enrollmentDate: startDate, plan, options, locker, coupon: discount, today });
    const computed = planMembershipStart({ settings, startDate, today, plan, options, locker, discount, receipt });
    if (computed.problems.length) fails.push(`計算とレシートの食い違い：${computed.problems.join(' / ')}`);
    const started = await startMembershipSubscription(stripe, { plan, customerId: customer.id, paymentMethodId: pm.id, membershipId: `test-${n}`, providerId: 'test', subscriptionItems: items, discount, computed });

    // 承認時の請求
    const ap = receipt.payments.find(g => g.key === 'approval');
    const paidNow = started.immediateInvoice ? started.immediateInvoice.amount_paid : 0;
    if ((ap?.total || 0) !== paidNow) fails.push(`承認時：請求${paidNow}円・レシート${ap?.total || 0}円`);

    // 定期の請求：レシートの予定どおりの順に、その日を過ぎるまで時計を進め、払われた額を比べる
    const expectedSeq = receipt.payments.filter(g => g.key !== 'approval').map(g => ({ date: g.date, total: g.total }));
    let state = { remaining: computed.remainingForSubscription, expected: started.expected, pendingItemId: started.pendingItemId };
    const seen = new Set();
    let due = expectedSeq[0].date;
    for (let k = 0; k < expectedSeq.length + 3; k++) {
      const exp = k < expectedSeq.length ? expectedSeq[k] : null;
      await advance(clock, addDays(exp ? exp.date : due, 1), 12);
      const invs = await stripe.invoices.list({ customer: customer.id, limit: 20 });
      const paid = invs.data.filter(i => i.status === 'paid' && i.metadata?.fineme_kind !== 'membership_initial' && !seen.has(i.id) && i.amount_paid > 0).sort((a, b) => a.created - b.created);
      if (!paid.length) { fails.push(`${k + 1}回目の定期の請求が見つかりません（${exp ? exp.date : '以後'}）`); break; }
      const inv = await stripe.invoices.retrieve(paid[0].id);
      seen.add(inv.id);
      const want = exp ? exp.total : receipt.after.amount;
      // 「以後」は割引の回数が終わると月会費そのままになる。レシートの after は「割引のある間」の額なので、残り回数で判断する
      const wantAfter = exp ? want : (state.remaining === 0 && discount && discount.duration !== 'forever' ? receipt.monthlyTotal : want);
      if (inv.amount_paid !== wantAfter) fails.push(`${k + 1}回目（${jstOf(inv.created)}）：請求${inv.amount_paid}円・レシート${wantAfter}円`);
      const r = checkPaidInvoice(inv, state);
      if (!r.check.ok) fails.push(`${k + 1}回目の点検：${r.check.problems.join(' / ')}`);
      state.remaining = r.remaining;
      const next = await prepareNextDiscount(stripe, { subscriptionId: started.subscription.id, customerId: customer.id, membershipId: `test-${n}`, discount, remaining: state.remaining, pendingItemId: state.pendingItemId, active: true });
      if (next.check && !next.check.ok) fails.push(`${k + 2}回目の見積もりの点検：${next.check.problems.join(' / ')}`);
      state = { ...state, expected: next.expected, pendingItemId: next.pendingItemId };
      due = next.expected?.due || addDays(due, 31);
      if (!exp) due = jstOf(inv.created + 31 * 86400);
    }
  } catch (e) {
    fails.push(`エラー：${e.message}${e.problems ? `（${e.problems.join(' / ')}）` : ''}`);
  } finally {
    try { await stripe.testHelpers.testClocks.del(clock.id); } catch {}
  }
  console.log(`${fails.length ? 'NG' : 'OK'} ${title}`);
  fails.forEach(f => console.log(`   - ${f}`));
  return fails.length === 0;
}

const only = process.env.TEST_CASE ? Number(process.env.TEST_CASE) : null;
let ok = 0; let total = 0;
for (let i = 0; i < CASES.length; i++) {
  if (only && only !== i + 1) continue;
  total++;
  if (await runCase(CASES[i], i + 1)) ok++;
}
console.log(`\n${ok}/${total} 件が一致`);
process.exit(ok === total ? 0 : 1);
