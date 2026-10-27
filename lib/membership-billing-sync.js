// 月会費の割引の付け直しと、請求額の点検の DB 側（lib/membership-billing-guard.js の処理を会員の行と結びつける）。
// webhook（請求が払われた・取り消された）と、契約の変更（プラン変更・オプション・割引・休会の再開など）の後に呼ぶ。
import { Resend } from 'resend';
import { prepareNextDiscount, checkPaidInvoice, isDiscountLine } from './membership-billing-guard.js';
import { membershipIdOf } from './membership-billing.js';

const yen = n => `¥${Number(n || 0).toLocaleString()}`;

// 食い違いを記録し、運営（ADMIN_EMAIL）と店舗に知らせる
export async function raiseBillingAlert(db, { providerId, membershipId, invoiceId = null, kind, problems = [], expected = null, actual = null }) {
  try {
    await db.from('provider_membership_billing_alerts').insert({ provider_id: providerId, membership_id: membershipId, stripe_invoice_id: invoiceId, kind, problems, expected, actual });
  } catch (e) { console.error('[billing alert] record failed', e?.message); }
  console.error('[billing alert]', kind, membershipId, invoiceId, problems.join(' / '));
  if (!process.env.RESEND_API_KEY) return;
  try {
    const [{ data: p }, { data: m }] = await Promise.all([
      db.from('providers').select('name, email').eq('id', providerId).maybeSingle(),
      membershipId ? db.from('provider_memberships').select('last_name, first_name').eq('id', membershipId).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const who = [m?.last_name, m?.first_name].filter(Boolean).join(' ') || '会員';
    const title = { approval_blocked: '入会の確定を止めました', upcoming: '次回の月会費の請求額に食い違いがあります', paid: '月会費の請求額に食い違いがありました' }[kind] || '月会費の請求額の確認';
    const text = [
      `${p?.name || '店舗'}の${who}様の月会費について、${title}。`,
      '',
      ...problems.map(x => `・${x}`),
      ...(expected != null || actual != null ? ['', `予定：${expected != null ? yen(expected) : '—'}　実際：${actual != null ? yen(actual) : '—'}`] : []),
      ...(invoiceId ? [`Stripeの請求書：${invoiceId}`] : []),
      '',
      kind === 'approval_blocked' ? '課金は始めていません。お客様にお見せした金額と、実際に請求する金額が合わなかったためです。' : 'お客様にお見せした金額と違う請求になっている可能性があります。内容を確認し、必要なら返金・調整してください。',
    ].join('\n');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const to = [process.env.ADMIN_EMAIL, kind === 'approval_blocked' ? null : p?.email].filter(Boolean);
    if (to.length) await resend.emails.send({ from: 'Fineme <noreply@fineme.me>', to, subject: `【月会費】${title}（${p?.name || '店舗'}）`, text });
  } catch (e) { console.error('[billing alert] notify failed', e?.message); }
}

async function loadMember(db, membershipId) {
  const { data: m } = await db.from('provider_memberships')
    .select('id, provider_id, status, stripe_subscription_id, stripe_customer_id, discount_id, discount_managed, discount_remaining, discount_pending_item_id, billing_expected')
    .eq('id', membershipId).maybeSingle();
  if (!m) return { m: null, d: null };
  const { data: d } = m.discount_id ? await db.from('provider_membership_discounts').select('id, name, kind, value, duration, months').eq('id', m.discount_id).maybeSingle() : { data: null };
  return { m, d };
}

// 次の請求に入れる割引の明細を付け直し、次の請求を見積もりで点検する
export async function syncManagedDiscount(db, stripe, membershipId) {
  if (!stripe) return null;
  const { m, d } = await loadMember(db, membershipId);
  if (!m?.discount_managed || !m.stripe_subscription_id) return null;
  const r = await prepareNextDiscount(stripe, {
    subscriptionId: m.stripe_subscription_id, customerId: m.stripe_customer_id, membershipId: m.id,
    discount: d, remaining: m.discount_remaining, pendingItemId: m.discount_pending_item_id, active: m.status === 'active',
  });
  await db.from('provider_memberships').update({ discount_pending_item_id: r.pendingItemId, billing_expected: r.expected, updated_at: new Date().toISOString() }).eq('id', m.id);
  if (r.check && !r.check.ok) await raiseBillingAlert(db, { providerId: m.provider_id, membershipId: m.id, kind: 'upcoming', problems: r.check.problems, expected: null, actual: r.check.total });
  return r;
}

// webhook：会員の月会費の請求が払われた（succeeded）・取り消された（void）時
export async function afterMembershipInvoice(db, stripe, invoice, kind) {
  const membershipId = membershipIdOf(invoice);
  if (!membershipId || !stripe) return;
  // 承認時の請求（承認の時に照合済み）は対象外。定期の請求だけ
  if (invoice?.metadata?.fineme_kind === 'membership_initial') return;
  const { m } = await loadMember(db, membershipId);
  if (!m?.discount_managed) return;

  if (kind === 'succeeded') {
    // 同じ請求書を2回数えない
    const used = -(invoice.lines?.data || []).filter(isDiscountLine).reduce((t, l) => t + (l.amount || 0), 0);
    const { error: dupErr } = await db.from('provider_membership_discount_uses').insert({ stripe_invoice_id: invoice.id, membership_id: m.id, provider_id: m.provider_id, amount: used });
    if (dupErr) return; // すでに処理済み（webhook の再送）
    const r = checkPaidInvoice(invoice, { remaining: m.discount_remaining, expected: m.billing_expected });
    if (r.remaining !== m.discount_remaining) await db.from('provider_memberships').update({ discount_remaining: r.remaining }).eq('id', m.id);
    if (!r.check.ok) await raiseBillingAlert(db, { providerId: m.provider_id, membershipId: m.id, invoiceId: invoice.id, kind: 'paid', problems: r.check.problems, expected: m.billing_expected?.total ?? null, actual: invoice.amount_paid ?? r.check.total });
    await syncManagedDiscount(db, stripe, m.id);
  } else if (kind === 'void') {
    // 休会などで請求が取り消された：割引の明細もその請求書と一緒に消えるので、次の請求に付け直す（回数は減らさない）
    await syncManagedDiscount(db, stripe, m.id);
  }
}
