// 会員プランの休会・プラン変更・退会（でお要望 2026-10-19：hacomono差分 #4）。
// 店舗の操作（ダッシュボード）と、お客様の申請を店舗が承認した時の両方からここを呼ぶ。
// Stripeのサブスクを先に変え、成功したらDBを更新する（Stripeだけ変わってDBが古い、を避けるため
// DB更新はStripe成功後のみ。逆にStripe失敗時は何も変えずエラーを返す）。

import { cancelPlan, normalizeCycle, memberCycle, stripeTs } from './membership-cycle.js';

const ymdJa = s => (s ? `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}` : '');

export const CHANGE_LABEL = { pause: '休会', resume: '休会から再開', plan_change: 'プラン変更', cancel: '退会', cancel_undo: '退会の取り消し', option_add: 'オプション追加', option_remove: 'オプション解除', discount_apply: '割引の適用', discount_remove: '割引の解除' };

const jst = ts => (ts ? new Date(ts * 1000 + 9 * 3600000).toISOString().slice(0, 10) : null);
const tsOf = date => Math.floor(new Date(`${date}T00:00:00+09:00`).getTime() / 1000);
export const periodEndOf = sub => sub?.current_period_end || sub?.items?.data?.[0]?.current_period_end || null;

export class ChangeError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// m: provider_memberships の行。opts: { kind, to_plan_id, timing, date, pause_until, requested_at（お客様の申請日時） }
export async function applyMembershipChange(db, stripe, m, opts) {
  const { kind } = opts;
  if (m.status !== 'active') throw new ChangeError('入会中の会員ではありません', 409);
  const now = new Date().toISOString();
  const subId = m.stripe_subscription_id;
  if (subId && !stripe) throw new ChangeError('カード決済は現在利用できません', 503);
  const sub = subId ? await stripe.subscriptions.retrieve(subId) : null;
  const up = { updated_at: now };
  const result = { effective_date: null };

  if (kind === 'pause') {
    if (m.paused_at) throw new ChangeError('すでに休会中です', 409);
    if (opts.pause_until && opts.pause_until <= jst(Date.now() / 1000)) throw new ChangeError('再開日は明日以降を選んでください');
    // 休会費（2026-11-28）：店舗の操作で金額を指定した時はそれ、無ければお店の設定（既定0円）
    const { data: settings } = await db.from('provider_membership_settings').select('pause_fee, pause_stripe_product_id, pause_keep_options').eq('provider_id', m.provider_id).maybeSingle();
    const fee = parsePauseFee(opts.pause_fee, settings?.pause_fee);
    if (fee == null) throw new ChangeError('休会費は0〜1,000,000円の整数で入れてください');
    // 休会中のオプション（2026-11-28 渡邉要望）：続けるものを店舗が選べる。選ばなかった時はお店の設定（既定は全部止める）
    const { data: optItems } = await db.from('provider_membership_option_items').select('id, name, monthly_price, stripe_item_id').eq('membership_id', m.id).eq('status', 'active');
    const items = optItems || [];
    const keepIds = new Set(Array.isArray(opts.keep_option_item_ids) ? opts.keep_option_item_ids.map(String) : (settings?.pause_keep_options ? items.map(i => i.id) : []));
    const kept = items.filter(i => keepIds.has(i.id));
    const stopped = items.filter(i => !keepIds.has(i.id));
    if (fee === 0 && !kept.length) {
      // 休会費なし・オプションも止める：休会中に作られる請求は丸ごと取り消す（void）。再開日を決めていればその日に自動で再開
      if (sub) await stripe.subscriptions.update(subId, { pause_collection: { behavior: 'void', ...(opts.pause_until ? { resumes_at: tsOf(opts.pause_until) } : {}) } });
      Object.assign(up, { paused_at: now, pause_until: opts.pause_until || null, pause_fee: null, pause_item_id: null, pause_return_price_id: null });
    } else {
      // 休会費あり、またはオプションを続ける：プランの明細を休会費（0円もあり）に、止めるオプションの明細を0円に差し替える
      // （次回の引き落としから。日割りはしない）。再開で元の金額に戻す
      let pauseItemId = null, returnPriceId = null;
      if (sub) {
        const item = await planItemOf(db, m, sub);
        if (!item) throw new ChangeError('月会費の明細が見つかりません', 409);
        const product = await ensurePauseProduct(db, stripe, m.provider_id, settings);
        const change = [{ id: item.id, price_data: { currency: 'jpy', product, unit_amount: fee, recurring: { interval: 'month' } } }];
        for (const o of stopped) {
          const si = (sub.items?.data || []).find(i => i.id === o.stripe_item_id);
          if (si) change.push({ id: si.id, price_data: { currency: 'jpy', product: productOf(si), unit_amount: 0, recurring: { interval: 'month' } } });
        }
        // ロッカー代も休会中は止める（請求を丸ごと取り消す方式と同じにそろえる）
        const lk = await lockerItemOf(db, m, sub);
        if (lk && (lk.item.price?.unit_amount ?? 0) > 0) change.push({ id: lk.item.id, price_data: { currency: 'jpy', product: productOf(lk.item), unit_amount: 0, recurring: { interval: 'month' } } });
        await stripe.subscriptions.update(subId, { items: change, proration_behavior: 'none' });
        pauseItemId = item.id; returnPriceId = item.price.id;
      }
      Object.assign(up, { paused_at: now, pause_until: opts.pause_until || null, pause_fee: fee, pause_item_id: pauseItemId, pause_return_price_id: returnPriceId });
    }
    if (stopped.length) await db.from('provider_membership_option_items').update({ paused_at: now }).in('id', stopped.map(i => i.id));
    result.pause_fee = fee;
    result.kept_options = kept.map(i => i.name);
    result.stopped_options = stopped.map(i => i.name);
    result.detail = [
      fee > 0 ? `休会費 月額¥${fee.toLocaleString()}` : '休会費なし',
      kept.length ? `続けるオプション：${kept.map(i => i.name).join('・')}` : '',
      stopped.length ? `止めるオプション：${stopped.map(i => i.name).join('・')}` : '',
    ].filter(Boolean).join('／');
    result.effective_date = jst(Date.now() / 1000);
  } else if (kind === 'resume') {
    if (!m.paused_at) throw new ChangeError('休会中ではありません', 409);
    if (m.pause_fee != null) {
      // 明細を差し替えた休会：プランと止めたオプションの明細を元の金額に戻す（次回の引き落としから）。戻し済みなら何もしない
      if (sub) await restorePauseItem(db, stripe, sub, m);
    } else if (sub) {
      await stripe.subscriptions.update(subId, { pause_collection: '' });
    }
    await db.from('provider_membership_option_items').update({ paused_at: null }).eq('membership_id', m.id).not('paused_at', 'is', null);
    Object.assign(up, PAUSE_CLEAR);
    result.effective_date = jst(Date.now() / 1000);
  } else if (kind === 'plan_change') {
    if (!opts.to_plan_id || opts.to_plan_id === m.plan_id) throw new ChangeError('変更先のプランを選んでください');
    // 明細を差し替えた休会中（休会費あり・オプションを続ける）は、再開してから変える
    if (m.paused_at && m.pause_fee != null) throw new ChangeError('休会中はプランを変更できません。休会から再開してから変更してください', 409);
    const { data: plans } = await db.from('provider_membership_plans').select('id, stripe_price_id, active').eq('provider_id', m.provider_id).in('id', [opts.to_plan_id, m.plan_id].filter(Boolean));
    const to = (plans || []).find(p => p.id === opts.to_plan_id);
    const from = (plans || []).find(p => p.id === m.plan_id);
    if (!to) throw new ChangeError('変更先のプランが見つかりません', 404);
    if (sub) {
      if (!to.stripe_price_id) throw new ChangeError('変更先のプランの料金がStripeに登録されていません', 409);
      // ロッカー代など他の明細は残し、プランの明細だけ差し替える
      const item = sub.items.data.find(i => i.price?.id === from?.stripe_price_id) || sub.items.data[0];
      // now＝今日から新しい月額（差額を日割りで精算）、period_end＝次回の引き落としから新しい月額
      await stripe.subscriptions.update(subId, {
        items: [{ id: item.id, price: to.stripe_price_id }],
        proration_behavior: opts.timing === 'now' ? 'create_prorations' : 'none',
      });
    }
    Object.assign(up, { plan_id: to.id });
    result.from_plan_id = m.plan_id;
    result.to_plan_id = to.id;
    result.effective_date = opts.timing === 'now' || !sub ? jst(Date.now() / 1000) : jst(periodEndOf(sub));
  } else if (kind === 'cancel') {
    if (m.cancel_at && opts.timing !== 'now') throw new ChangeError(`すでに${m.cancel_at.replace(/-/g, '/')}で退会予定です`, 409);
    if (opts.timing === 'now') {
      if (sub) await stripe.subscriptions.cancel(subId);
      Object.assign(up, { status: 'cancelled', cancelled_at: now, cancel_at: jst(Date.now() / 1000), ...PAUSE_CLEAR });
      await endLockerContracts(db, m.id);
      result.effective_date = up.cancel_at;
    } else if (opts.timing === 'date') {
      if (!opts.date || opts.date <= jst(Date.now() / 1000)) throw new ChangeError('退会日は明日以降を選んでください');
      if (sub) await stripe.subscriptions.update(subId, { cancel_at: stripeTs(opts.date), proration_behavior: 'none' });
      Object.assign(up, { cancel_at: opts.date });
      result.effective_date = opts.date;
    } else if (sub) {
      // 既定：お店の退会の締め日で決める（でお指摘・でお要望 2026-10-27）。毎月◯日締めなら、締め日までの申し込みはその月分まで、
      // 過ぎたら翌月分まで払って退会。申し込み日はお客様が申し込んだ日（お店の承認が遅れても不利にしない）。
      // 請求の基準（請求日・前の月／その月／次の月）は承認した時のもの、締め日はお店の今の設定。
      const { data: settings } = await db.from('provider_membership_settings').select('*').eq('provider_id', m.provider_id).maybeSingle();
      const cyc = normalizeCycle({ ...memberCycle(m), cancel_cutoff_day: settings?.cancel_cutoff_day, cancel_cutoff_days_before: settings?.cancel_cutoff_days_before });
      const requestDate = opts.requested_at ? jst(Date.parse(opts.requested_at) / 1000) : jst(Date.now() / 1000);
      const plan = cancelPlan(cyc, { requestDate, nextBilling: jst(periodEndOf(sub)), startDate: m.billing_start_date });
      const endTs = stripeTs(plan.stripeEnd);
      if (endTs <= Math.floor(Date.now() / 1000) + 60) {
        // もう次の請求をしない日を過ぎている（入会した月より前に退会など）：サブスクはすぐ終える
        await stripe.subscriptions.cancel(subId, { prorate: false });
      } else if (periodEndOf(sub) === endTs) {
        await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
      } else {
        await stripe.subscriptions.update(subId, { cancel_at: endTs, proration_behavior: 'none' });
      }
      Object.assign(up, { cancel_at: plan.endDate });
      result.effective_date = plan.endDate;
      result.detail = cyc.billing_mode === 'anniversary'
        ? `${ymdJa(plan.lastDay)}までご利用。${plan.lastCharge ? `締め日（${ymdJa(plan.cutoff)}）を過ぎたため、${ymdJa(plan.lastCharge)}の請求が最後` : '今後の請求はありません'}`
        : `${plan.lastMonthLabel}まで（${ymdJa(plan.lastDay)}まで）ご利用。${plan.lastCharge ? `${ymdJa(plan.lastCharge)}の${plan.lastChargeLabel}の請求が最後` : '今後の請求はありません'}${plan.inTime ? '' : `（締め日${ymdJa(plan.cutoff)}を過ぎたため）`}`;
    } else {
      Object.assign(up, { cancel_at: jst(Date.now() / 1000) });
      result.effective_date = up.cancel_at;
    }
    if (opts.reason) up.cancel_reason = opts.reason;
  } else if (kind === 'cancel_undo') {
    if (!m.cancel_at) throw new ChangeError('退会の予定はありません', 409);
    if (sub) await stripe.subscriptions.update(subId, sub.cancel_at_period_end ? { cancel_at_period_end: false } : { cancel_at: '' });
    Object.assign(up, { cancel_at: null, cancel_reason: null });
  } else if (kind === 'option_add') {
    const { data: opt } = await db.from('provider_membership_options').select('*').eq('id', opts.option_id).eq('provider_id', m.provider_id).maybeSingle();
    if (!opt || !opt.active) throw new ChangeError('オプションが見つかりません', 404);
    const { data: dup } = await db.from('provider_membership_option_items').select('id').eq('membership_id', m.id).eq('option_id', opt.id).eq('status', 'active').limit(1).maybeSingle();
    if (dup) throw new ChangeError('このオプションはすでに付いています', 409);
    let stripeItemId = null;
    if (sub) {
      const product = await ensureOptionProduct(db, stripe, opt);
      // 次回の引き落としから（日割りの精算はしない）
      const item = await stripe.subscriptionItems.create({ subscription: subId, price_data: { currency: 'jpy', product, unit_amount: opt.monthly_price, recurring: { interval: 'month' } }, proration_behavior: 'none' });
      stripeItemId = item.id;
    }
    await db.from('provider_membership_option_items').insert({ provider_id: m.provider_id, membership_id: m.id, option_id: opt.id, name: opt.name, monthly_price: opt.monthly_price, stripe_item_id: stripeItemId });
    result.detail = `${opt.name}（月額¥${opt.monthly_price.toLocaleString()}）`;
    result.effective_date = sub ? jst(periodEndOf(sub)) : jst(Date.now() / 1000);
  } else if (kind === 'option_remove') {
    const { data: it } = await db.from('provider_membership_option_items').select('*').eq('id', opts.item_id).eq('membership_id', m.id).eq('status', 'active').maybeSingle();
    if (!it) throw new ChangeError('オプションが見つかりません', 404);
    if (sub && it.stripe_item_id) await stripe.subscriptionItems.del(it.stripe_item_id, { proration_behavior: 'none' });
    await db.from('provider_membership_option_items').update({ status: 'ended', ended_at: now }).eq('id', it.id);
    result.detail = `${it.name}（月額¥${it.monthly_price.toLocaleString()}）`;
    result.effective_date = sub ? jst(periodEndOf(sub)) : jst(Date.now() / 1000);
  } else if (kind === 'discount_apply') {
    const { data: d } = await db.from('provider_membership_discounts').select('*').eq('id', opts.discount_id).eq('provider_id', m.provider_id).maybeSingle();
    if (!d || !d.active) throw new ChangeError('割引が見つかりません', 404);
    if (d.applies_to === 'initial_fee') throw new ChangeError('入会金から引く割引は、入会の時にだけ使えます', 400);
    if (m.discount_managed) {
      // Fineme が請求書に割引の明細を入れる会員（でお指摘 2026-10-27：レシートと請求を必ずそろえる）。
      // Stripe のクーポンは付けない。次の請求からの割引の明細は、呼び出し側の syncManagedDiscount が付ける
      if (sub && (sub.discounts || []).length) await stripe.subscriptions.update(subId, { discounts: '' });
      const times = d.duration === 'forever' ? null : d.duration === 'repeating' ? Math.max(1, Number(d.months) || 1) : 1;
      Object.assign(up, { discount_id: d.id, discount_applied_at: now, discount_remaining: times });
    } else {
      // 以前の会員：Stripeのサブスクに付けられる割引は1つ（付け替え）
      if (sub) await stripe.subscriptions.update(subId, { discounts: [{ coupon: await ensureStripeCoupon(db, stripe, d) }] });
      Object.assign(up, { discount_id: d.id, discount_applied_at: now });
    }
    result.detail = `${d.name}（${discountText(d)}）`;
    result.effective_date = sub ? jst(periodEndOf(sub)) : jst(Date.now() / 1000);
  } else if (kind === 'discount_remove') {
    if (!m.discount_id) throw new ChangeError('割引は付いていません', 409);
    if (sub && (!m.discount_managed || (sub.discounts || []).length)) await stripe.subscriptions.update(subId, { discounts: '' });
    const { data: d } = await db.from('provider_membership_discounts').select('name, kind, value, duration, months').eq('id', m.discount_id).maybeSingle();
    Object.assign(up, { discount_id: null, discount_applied_at: null, ...(m.discount_managed ? { discount_remaining: 0 } : {}) });
    result.detail = d ? `${d.name}（${discountText(d)}）` : null;
    result.effective_date = jst(Date.now() / 1000);
  } else {
    throw new ChangeError('操作の種類が正しくありません');
  }

  const { error } = await db.from('provider_memberships').update(up).eq('id', m.id);
  if (error) throw new ChangeError(error.message, 500);
  return result;
}

// 休会の状態を消す（再開・退会）
export const PAUSE_CLEAR = { paused_at: null, pause_until: null, pause_fee: null, pause_item_id: null, pause_return_price_id: null };

// 休会費：指定があればそれ（空欄は設定の値）、無ければ設定の値。範囲外は null
export function parsePauseFee(v, fallback) {
  const raw = v === undefined || v === null || v === '' ? (fallback ?? 0) : v;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 1000000 ? n : null;
}

// Stripeの明細の商品ID
const productOf = si => (typeof si?.price?.product === 'string' ? si.price.product : si?.price?.product?.id);

// サブスクの中の、入会時に契約したロッカー代の明細と、その月額
async function lockerItemOf(db, m, sub) {
  if (!m.locker_id) return null;
  const { data: locker } = await db.from('provider_lockers').select('monthly_fee, stripe_product_id').eq('id', m.locker_id).maybeSingle();
  if (!locker?.stripe_product_id) return null;
  const item = (sub.items?.data || []).find(i => productOf(i) === locker.stripe_product_id);
  return item ? { item, fee: Number(locker.monthly_fee) || 0 } : null;
}

// サブスクの中の、プラン（月会費）の明細。オプション・割引の明細は除く
async function planItemOf(db, m, sub) {
  const items = sub.items?.data || [];
  const [{ data: plan }, { data: opts }] = await Promise.all([
    m.plan_id ? db.from('provider_membership_plans').select('stripe_price_id, stripe_product_id').eq('id', m.plan_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('provider_membership_option_items').select('stripe_item_id').eq('membership_id', m.id),
  ]);
  const byPrice = plan?.stripe_price_id && items.find(i => i.price?.id === plan.stripe_price_id);
  if (byPrice) return byPrice;
  // プランの月額を変えた後（価格は新しくなるが商品は同じ）
  const byProduct = plan?.stripe_product_id && items.find(i => productOf(i) === plan.stripe_product_id);
  if (byProduct) return byProduct;
  const lk = await lockerItemOf(db, m, sub);
  const skip = new Set([...(opts || []).map(o => o.stripe_item_id), m.discount_pending_item_id, lk?.item.id].filter(Boolean));
  return items.find(i => !skip.has(i.id) && (i.price?.unit_amount ?? 0) > 0) || null;
}

// 休会で差し替えた明細（プラン・止めたオプション）を元の金額に戻す（日割りはしない）。戻した時は true。
// 止めていたオプションの印（paused_at）もここで消す
export async function restorePauseItem(db, stripe, sub, m) {
  const subItems = sub.items?.data || [];
  const change = [];
  if (m.pause_item_id && m.pause_return_price_id && subItems.some(i => i.id === m.pause_item_id)) {
    change.push({ id: m.pause_item_id, price: m.pause_return_price_id });
  }
  const { data: paused } = await db.from('provider_membership_option_items').select('id, monthly_price, stripe_item_id').eq('membership_id', m.id).eq('status', 'active').not('paused_at', 'is', null);
  for (const o of paused || []) {
    const si = subItems.find(i => i.id === o.stripe_item_id);
    if (si) change.push({ id: si.id, price_data: { currency: 'jpy', product: productOf(si), unit_amount: o.monthly_price, recurring: { interval: 'month' } } });
  }
  // 休会で0円にしたロッカー代を戻す
  const lk = await lockerItemOf(db, m, sub);
  if (lk && (lk.item.price?.unit_amount ?? 0) === 0 && lk.fee > 0) change.push({ id: lk.item.id, price_data: { currency: 'jpy', product: productOf(lk.item), unit_amount: lk.fee, recurring: { interval: 'month' } } });
  if (change.length) await stripe.subscriptions.update(sub.id || m.stripe_subscription_id, { items: change, proration_behavior: 'none' });
  if ((paused || []).length) await db.from('provider_membership_option_items').update({ paused_at: null }).in('id', paused.map(o => o.id));
  return change.length > 0;
}

// Stripeの「休会費」の商品（お店ごとに1つ作って使い回す）
async function ensurePauseProduct(db, stripe, providerId, settings) {
  if (settings?.pause_stripe_product_id) return settings.pause_stripe_product_id;
  const product = await stripe.products.create({ name: '休会費', metadata: { fineme_provider_id: String(providerId), fineme_kind: 'membership_pause_fee' } });
  await db.from('provider_membership_settings').upsert({ provider_id: providerId, pause_stripe_product_id: product.id, updated_at: new Date().toISOString() });
  return product.id;
}

// 退会した会員のロッカー契約も終える（入会時に一緒に契約したもの）
export async function endLockerContracts(db, membershipId) {
  await db.from('provider_locker_contracts').update({ status: 'cancelled' }).eq('membership_id', membershipId).eq('status', 'active');
}

// Stripeのエラーを店舗・お客様向けの日本語に
export function changeErrorMessage(e) {
  if (e instanceof ChangeError) return e.message;
  console.error('[membership change]', e?.message);
  return 'カード決済の手続きに失敗しました。時間をおいてもう一度お試しください';
}

// 「月¥1,000引き・3か月」のような表示
export function discountText(d) {
  const v = d.kind === 'percent' ? `${d.value}%引き` : `¥${Number(d.value).toLocaleString()}引き`;
  if (d.applies_to === 'initial_fee') return `入会金から${v}`;
  const dur = d.duration === 'forever' ? 'ずっと' : d.duration === 'repeating' ? `${d.months}か月` : '初回のみ';
  return `${v}・${dur}`;
}

// 割引をStripeのクーポンとして用意する（一度作ったら使い回す。金額などを変えた時は作り直す）
export async function ensureStripeCoupon(db, stripe, d) {
  if (d.stripe_coupon_id) return d.stripe_coupon_id;
  const c = await stripe.coupons.create({
    name: d.name.slice(0, 40),
    ...(d.kind === 'percent' ? { percent_off: d.value } : { amount_off: d.value, currency: 'jpy' }),
    duration: d.duration,
    ...(d.duration === 'repeating' ? { duration_in_months: d.months } : {}),
    metadata: { fineme_provider_id: d.provider_id, fineme_discount_id: d.id },
  });
  await db.from('provider_membership_discounts').update({ stripe_coupon_id: c.id }).eq('id', d.id);
  return c.id;
}

export async function ensureOptionProduct(db, stripe, opt) {
  if (opt.stripe_product_id) return opt.stripe_product_id;
  const product = await stripe.products.create({ name: `オプション：${opt.name}`.slice(0, 250) });
  await db.from('provider_membership_options').update({ stripe_product_id: product.id }).eq('id', opt.id);
  return product.id;
}

// お客様が入会時に入れたクーポンコードを確かめる。使えるなら割引の行を返す
export async function findCoupon(db, providerId, code) {
  const c = String(code || '').trim();
  if (!c) return { error: 'クーポンコードを入力してください' };
  const { data: d } = await db.from('provider_membership_discounts').select('*').eq('provider_id', providerId).ilike('code', c.replace(/[%_\\]/g, '\\$&')).maybeSingle();
  if (!d || !d.active) return { error: 'このクーポンコードは使えません' };
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  if (d.valid_until && d.valid_until < today) return { error: 'このクーポンは有効期限が切れています' };
  if (d.max_uses && d.used_count >= d.max_uses) return { error: 'このクーポンは利用上限に達しました' };
  return { discount: d };
}

// 割引・クーポンの作成内容を確かめる
export function validateDiscountInput(b) {
  const name = String(b.name || '').trim().slice(0, 60);
  const kind = b.kind === 'percent' ? 'percent' : 'amount';
  const value = Math.round(Number(b.value));
  const applies_to = b.applies_to === 'initial_fee' ? 'initial_fee' : 'monthly';
  // 入会金から引く割引は入会時の1回だけ
  const duration = applies_to === 'initial_fee' ? 'once' : ['once', 'repeating', 'forever'].includes(b.duration) ? b.duration : 'once';
  const months = duration === 'repeating' ? Math.round(Number(b.months)) : null;
  const code = String(b.code || '').trim().slice(0, 30) || null;
  if (!name) return { error: '名前を入れてください' };
  if (!(value > 0) || (kind === 'percent' && value > 100)) return { error: kind === 'percent' ? '割引率は1〜100％で入れてください' : '割引額は1円以上で入れてください' };
  if (duration === 'repeating' && !(months >= 1 && months <= 36)) return { error: '割引する月数は1〜36か月で入れてください' };
  if (code && !/^[A-Za-z0-9_-]+$/.test(code)) return { error: 'クーポンコードは半角英数字・ハイフン・アンダーバーで入れてください' };
  return { row: { name, kind, value, duration, months, applies_to, code, max_uses: b.max_uses ? Math.max(1, Math.round(Number(b.max_uses))) : null, valid_until: b.valid_until || null } };
}
