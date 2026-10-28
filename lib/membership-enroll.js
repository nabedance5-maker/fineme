// お客様のオンライン入会の申し込み（カード登録が終わった時）を確定し、お店に知らせる（でお指摘 2026-10-28：
// オンライン入会してもお店のメールやLINEに通知が来ない）。
// お客様が入会ページに戻ってきた時（/api/me/memberships/[id]/confirm-setup）と、Stripeからの完了通知
// （webhook の checkout.session.completed）の両方から呼ぶ。カード登録の直後に画面を閉じた人も取りこぼさないため。
// どちらが先に来ても、承認待ちにするのと通知は1回だけ。
import { logCustomerActivity } from './activity-log.js';
import { providerRecipients } from './provider-recipients.js';
import { sendMembershipRequestEmail } from './email.js';
import { sendLinePush } from './line-push.js';

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

export async function completeEnrollmentSetup(db, stripe, membershipId, session = null) {
  const { data: m } = await db.from('provider_memberships').select('*').eq('id', membershipId).maybeSingle();
  if (!m) return { error: '見つかりません', status: 404 };
  if (m.status === 'pending_approval' || m.status === 'active') return { membership: m, already: true };
  const s = session || (m.stripe_checkout_session_id ? await stripe.checkout.sessions.retrieve(m.stripe_checkout_session_id, { expand: ['setup_intent'] }) : null);
  if (!s) return { error: '決済手続きが開始されていません', status: 409 };
  let si = s.setup_intent;
  if (typeof si === 'string') si = await stripe.setupIntents.retrieve(si);
  if (s.status !== 'complete' || !si?.payment_method) return { error: 'カードの登録が完了していません', status: 409 };
  const paymentMethodId = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method.id;

  // まだ承認待ちになっていない時だけ進める（二重に通知しないよう、状態を条件に更新する）
  const { data: updated } = await db.from('provider_memberships')
    .update({ status: 'pending_approval', stripe_payment_method_id: paymentMethodId, updated_at: new Date().toISOString() })
    .eq('id', m.id).not('status', 'in', '(pending_approval,active)')
    .select().maybeSingle();
  if (!updated) {
    const { data: cur } = await db.from('provider_memberships').select('*').eq('id', m.id).maybeSingle();
    return { membership: cur, already: true };
  }
  const customerName = [m.last_name, m.first_name].filter(Boolean).join(' ') || 'お客様';
  try { await logCustomerActivity({ providerId: m.provider_id, userId: m.user_id, name: customerName, label: 'お客様が入会を申し込み', category: '顧客', targetId: m.id }); } catch {}
  try { await notifyEnrollment(db, updated, customerName); } catch (e) { console.error('[membership enroll notify]', e?.message); }
  return { membership: updated };
}

async function notifyEnrollment(db, m, customerName) {
  const [{ data: prov }, { data: plan }] = await Promise.all([
    db.from('providers').select('name, email, notify_emails, line_user_id').eq('id', m.provider_id).single(),
    m.plan_id ? db.from('provider_membership_plans').select('name, monthly_price').eq('id', m.plan_id).maybeSingle() : { data: null },
  ]);
  const lines = [
    `プラン：${plan?.name || '—'}${plan?.monthly_price ? `（月額 ¥${Number(plan.monthly_price).toLocaleString()}）` : ''}`,
    m.enrollment_date && `入会の希望日：${m.enrollment_date}`,
    m.phone && `電話番号：${m.phone}`,
    'カードの登録まで済んでいます。内容を確認して承認すると、入会が確定してお支払いが始まります。',
  ].filter(Boolean);
  const dashboardUrl = `${BASE}/provider/dashboard?tab=memberships`;
  if (providerRecipients(prov).length) {
    await sendMembershipRequestEmail({ to: providerRecipients(prov), providerName: prov.name, customerName, kindLabel: '入会', lines, dashboardUrl });
  }
  if (prov?.line_user_id) {
    await sendLinePush(prov.line_user_id, `【Fineme】${customerName}様からオンラインで入会の申し込みがありました。\n${lines.join('\n')}\n管理画面の「入会手続き」で承認してください。\n${dashboardUrl}`);
  }
}
