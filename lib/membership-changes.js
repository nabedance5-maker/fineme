// 会員プランの休会・プラン変更・退会（でお要望 2026-10-19：hacomono差分 #4）。
// 店舗の操作（ダッシュボード）と、お客様の申請を店舗が承認した時の両方からここを呼ぶ。
// Stripeのサブスクを先に変え、成功したらDBを更新する（Stripeだけ変わってDBが古い、を避けるため
// DB更新はStripe成功後のみ。逆にStripe失敗時は何も変えずエラーを返す）。

export const CHANGE_LABEL = { pause: '休会', resume: '休会から再開', plan_change: 'プラン変更', cancel: '退会', cancel_undo: '退会の取り消し' };

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
