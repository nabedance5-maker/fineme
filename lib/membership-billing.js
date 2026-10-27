// 月会費（会員プラン）の支払いの記録と、支払い失敗の対応（でお要望 2026-10-19：hacomonoの「月会費支払状況」相当）。
// お客様の月会費のStripeサブスクは、店舗自身のFinemeの契約（providers.plan）とは別物。webhookで取り違えないよう、
// 会員プランの請求はここで扱う。
import { endLockerContracts } from './membership-changes.js';

export function membershipIdOf(obj) {
  return obj?.subscription_details?.metadata?.fineme_membership_id
    || obj?.parent?.subscription_details?.metadata?.fineme_membership_id
    || obj?.metadata?.fineme_membership_id
    || null;
}

const jstDate = sec => (sec ? new Date(sec * 1000 + 9 * 3600000).toISOString().slice(0, 10) : null);

// invoice.payment_succeeded / invoice.payment_failed / invoice.voided / invoice.marked_uncollectible
export async function recordMembershipInvoice(db, invoice, kind) {
  const membershipId = membershipIdOf(invoice);
  if (!membershipId) return false;
  // 入会日までの待ち期間（trial）に Stripe が作る0円の請求書は、支払いとして記録しない
  if (kind === 'succeeded' && !(invoice.amount_paid > 0) && !(invoice.amount_due > 0)) return true;
  const { data: m } = await db.from('provider_memberships').select('id, provider_id, last_name, first_name, plan_id').eq('id', membershipId).maybeSingle();
  if (!m) return true;
  const status = kind === 'succeeded' ? 'paid' : kind === 'failed' ? 'failed' : kind === 'void' ? 'void' : 'open';
  const now = new Date().toISOString();
  const row = {
    provider_id: m.provider_id,
    membership_id: m.id,
    stripe_invoice_id: invoice.id,
    amount: status === 'paid' ? (invoice.amount_paid || 0) : (invoice.amount_due || 0),
    status,
    period_start: jstDate(invoice.period_start || invoice.lines?.data?.[0]?.period?.start),
    failure_message: status === 'failed' ? (invoice.last_finalization_error?.message || '引き落としできませんでした（カードの有効期限・残高・利用停止など）') : null,
    attempt_count: invoice.attempt_count || 0,
    next_attempt_at: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null,
    paid_at: status === 'paid' ? now : null,
    updated_at: now,
  };
  const { data: existing } = await db.from('provider_membership_payments').select('id, sales_entry_id').eq('stripe_invoice_id', invoice.id).maybeSingle();
  let paymentId = existing?.id;
  if (existing) await db.from('provider_membership_payments').update(row).eq('id', existing.id);
  else { const { data } = await db.from('provider_membership_payments').insert(row).select('id').single(); paymentId = data?.id; }

  if (status === 'paid') {
    // 売上に1回だけ記録する
    if (!existing?.sales_entry_id && row.amount > 0) {
      const { data: plan } = m.plan_id ? await db.from('provider_membership_plans').select('name').eq('id', m.plan_id).maybeSingle() : { data: null };
      const { data: sale } = await db.from('provider_sales_entries').insert({
        provider_id: m.provider_id,
        entry_date: new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10),
        amount: row.amount,
        menu_name: `月会費：${plan?.name || '会員プラン'}`,
        payment_method: 'オンライン決済（月会費）',
        memo: [m.last_name, m.first_name].filter(Boolean).join(' ') || null,
        source: 'manual',
      }).select('id').maybeSingle();
      if (sale?.id && paymentId) await db.from('provider_membership_payments').update({ sales_entry_id: sale.id }).eq('id', paymentId);
    }
    await db.from('provider_memberships').update({ payment_status: 'ok', last_paid_at: now, updated_at: now }).eq('id', m.id);
  } else if (status === 'failed') {
    await db.from('provider_memberships').update({ payment_status: 'past_due', last_failed_at: now, updated_at: now }).eq('id', m.id);
  }
  return true;
}

// customer.subscription.updated / deleted（会員プランのサブスク）
export async function recordMembershipSubscription(db, sub, deleted) {
  const membershipId = sub?.metadata?.fineme_membership_id;
  if (!membershipId) return false;
  const now = new Date().toISOString();
  const up = { updated_at: now };
  if (deleted) Object.assign(up, { status: 'cancelled', cancelled_at: now, paused_at: null, pause_until: null });
  // 休会の再開日が来てStripeが自動で再開した時など、休会の状態をStripeに合わせる
  else if (!sub.pause_collection) Object.assign(up, { paused_at: null, pause_until: null });
  if (sub.status === 'past_due') up.payment_status = 'past_due';
  if (sub.status === 'unpaid') up.payment_status = 'unpaid';
  if (sub.status === 'active') up.payment_status = 'ok';
  await db.from('provider_memberships').update(up).eq('id', membershipId);
  if (deleted) await endLockerContracts(db, membershipId);
  return true;
}

// お客様がカード更新リンク（Checkoutのsetupモード）で新しいカードを登録した時：
// 既定のカードを差し替え、未払いの月会費の請求を引き落とし直す
export async function applyMembershipCardUpdate(db, session, stripe) {
  const membershipId = session.metadata?.fineme_membership_card_update;
  const { data: m } = await db.from('provider_memberships').select('id, stripe_customer_id, stripe_subscription_id').eq('id', membershipId).maybeSingle();
  if (!m?.stripe_subscription_id) return;
  const si = typeof session.setup_intent === 'string' ? await stripe.setupIntents.retrieve(session.setup_intent) : session.setup_intent;
  const pm = si?.payment_method;
  if (!pm) return;
  await stripe.customers.update(m.stripe_customer_id, { invoice_settings: { default_payment_method: pm } });
  await stripe.subscriptions.update(m.stripe_subscription_id, { default_payment_method: pm });
  await db.from('provider_memberships').update({ stripe_payment_method_id: pm, updated_at: new Date().toISOString() }).eq('id', m.id);
  const open = await stripe.invoices.list({ subscription: m.stripe_subscription_id, status: 'open', limit: 10 });
  for (const inv of open.data) {
    try { await stripe.invoices.pay(inv.id, { payment_method: pm }); } catch { /* 失敗はwebhookで記録される */ }
  }
}
