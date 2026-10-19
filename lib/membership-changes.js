// 会員プランの休会・プラン変更・退会（でお要望 2026-10-19：hacomono差分 #4）。
// 店舗の操作（ダッシュボード）と、お客様の申請を店舗が承認した時の両方からここを呼ぶ。
// Stripeのサブスクを先に変え、成功したらDBを更新する（Stripeだけ変わってDBが古い、を避けるため
// DB更新はStripe成功後のみ。逆にStripe失敗時は何も変えずエラーを返す）。

export const CHANGE_LABEL = { pause: '休会', resume: '休会から再開', plan_change: 'プラン変更', cancel: '退会', cancel_undo: '退会の取り消し', option_add: 'オプション追加', option_remove: 'オプション解除', discount_apply: '割引の適用', discount_remove: '割引の解除' };

const jst = ts => (ts ? new Date(ts * 1000 + 9 * 3600000).toISOString().slice(0, 10) : null);
const tsOf = date => Math.floor(new Date(`${date}T00:00:00+09:00`).getTime() / 1000);
export const periodEndOf = sub => sub?.current_period_end || sub?.items?.data?.[0]?.current_period_end || null;

export class ChangeError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// m: provider_memberships の行。opts: { kind, to_plan_id, timing, date, pause_until }
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
    // 休会中に作られる月会費の請求は取り消す（void）。再開日を決めていればその日に自動で再開
    if (sub) await stripe.subscriptions.update(subId, { pause_collection: { behavior: 'void', ...(opts.pause_until ? { resumes_at: tsOf(opts.pause_until) } : {}) } });
    Object.assign(up, { paused_at: now, pause_until: opts.pause_until || null });
    result.effective_date = jst(Date.now() / 1000);
  } else if (kind === 'resume') {
    if (!m.paused_at) throw new ChangeError('休会中ではありません', 409);
    if (sub) await stripe.subscriptions.update(subId, { pause_collection: '' });
    Object.assign(up, { paused_at: null, pause_until: null });
    result.effective_date = jst(Date.now() / 1000);
  } else if (kind === 'plan_change') {
    if (!opts.to_plan_id || opts.to_plan_id === m.plan_id) throw new ChangeError('変更先のプランを選んでください');
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
      Object.assign(up, { status: 'cancelled', cancelled_at: now, cancel_at: jst(Date.now() / 1000), paused_at: null, pause_until: null });
      await endLockerContracts(db, m.id);
      result.effective_date = up.cancel_at;
    } else if (opts.timing === 'date') {
      if (!opts.date || opts.date <= jst(Date.now() / 1000)) throw new ChangeError('退会日は明日以降を選んでください');
      if (sub) await stripe.subscriptions.update(subId, { cancel_at: tsOf(opts.date), proration_behavior: 'none' });
      Object.assign(up, { cancel_at: opts.date });
      result.effective_date = opts.date;
    } else {
      // 既定：今の支払い期間の終わりで退会（すでに払った分の期間は通える）
      if (sub) await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
      Object.assign(up, { cancel_at: sub ? jst(periodEndOf(sub)) : jst(Date.now() / 1000) });
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
    // Stripeのサブスクに付けられる割引は1つ（付け替え）
    if (sub) await stripe.subscriptions.update(subId, { discounts: [{ coupon: await ensureStripeCoupon(db, stripe, d) }] });
    Object.assign(up, { discount_id: d.id, discount_applied_at: now });
    result.detail = `${d.name}（${discountText(d)}）`;
    result.effective_date = sub ? jst(periodEndOf(sub)) : jst(Date.now() / 1000);
  } else if (kind === 'discount_remove') {
    if (!m.discount_id) throw new ChangeError('割引は付いていません', 409);
    if (sub) await stripe.subscriptions.update(subId, { discounts: '' });
    const { data: d } = await db.from('provider_membership_discounts').select('name, kind, value, duration, months').eq('id', m.discount_id).maybeSingle();
    Object.assign(up, { discount_id: null, discount_applied_at: null });
    result.detail = d ? `${d.name}（${discountText(d)}）` : null;
    result.effective_date = jst(Date.now() / 1000);
  } else {
    throw new ChangeError('操作の種類が正しくありません');
  }

  const { error } = await db.from('provider_memberships').update(up).eq('id', m.id);
  if (error) throw new ChangeError(error.message, 500);
  return result;
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
  const duration = ['once', 'repeating', 'forever'].includes(b.duration) ? b.duration : 'once';
  const months = duration === 'repeating' ? Math.round(Number(b.months)) : null;
  const code = String(b.code || '').trim().slice(0, 30) || null;
  if (!name) return { error: '名前を入れてください' };
  if (!(value > 0) || (kind === 'percent' && value > 100)) return { error: kind === 'percent' ? '割引率は1〜100％で入れてください' : '割引額は1円以上で入れてください' };
  if (duration === 'repeating' && !(months >= 1 && months <= 36)) return { error: '割引する月数は1〜36か月で入れてください' };
  if (code && !/^[A-Za-z0-9_-]+$/.test(code)) return { error: 'クーポンコードは半角英数字・ハイフン・アンダーバーで入れてください' };
  return { row: { name, kind, value, duration, months, code, max_uses: b.max_uses ? Math.max(1, Math.round(Number(b.max_uses))) : null, valid_until: b.valid_until || null } };
}
