// お客様のオンライン入会の申し込み（カード登録が終わった時）を確定し、お店に知らせる（でお指摘 2026-10-28：
// オンライン入会してもお店のメールやLINEに通知が来ない）。
// お客様が入会ページに戻ってきた時（/api/me/memberships/[id]/confirm-setup）と、Stripeからの完了通知
// （webhook の checkout.session.completed）の両方から呼ぶ。カード登録の直後に画面を閉じた人も取りこぼさないため。
// どちらが先に来ても、承認待ちにするのと通知は1回だけ。
import { logCustomerActivity } from './activity-log.js';
import { providerRecipients } from './provider-recipients.js';
import { sendMembershipRequestEmail } from './email.js';
import { sendLinePush } from './line-push.js';
import { approveMembership } from './membership-approve.js';

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

  // 自動承認（2026-11-12 渡邉要望）：お店がオンにしていれば、ここで承認と同じ処理をして入会を確定する。
  // 払えなかった・ロッカーが埋まっていた等で確定できなければ承認待ちのまま残し、お店に理由を知らせて手で承認してもらう
  const auto = await autoApprove(db, stripe, updated);
  try { await notifyEnrollment(db, auto.membership || updated, customerName, auto); } catch (e) { console.error('[membership enroll notify]', e?.message); }
  return { membership: auto.membership || updated };
}

async function autoApprove(db, stripe, m) {
  const { data: settings } = await db.from('provider_membership_settings').select('auto_approve').eq('provider_id', m.provider_id).maybeSingle();
  if (!settings?.auto_approve) return { tried: false };
  try {
    const { data: provider } = await db.from('providers').select('id, stripe_connect_id, stripe_connect_status, plan').eq('id', m.provider_id).single();
    const r = await approveMembership(db, stripe, provider, m.id);
    if (r.status === 200) {
      try { await logCustomerActivity({ providerId: m.provider_id, userId: m.user_id, name: [m.last_name, m.first_name].filter(Boolean).join(' ') || 'お客様', label: '入会を自動で承認', category: '顧客', targetId: m.id }); } catch {}
      return { tried: true, membership: r.body };
    }
    return { tried: true, error: r.body?.error || '承認できませんでした' };
  } catch (e) {
    console.error('[membership auto approve]', e?.message);
    return { tried: true, error: '承認の処理中にエラーが起きました' };
  }
}

async function notifyEnrollment(db, m, customerName, auto = {}) {
  const [{ data: prov }, { data: plan }] = await Promise.all([
    db.from('providers').select('name, email, notify_emails, line_user_id').eq('id', m.provider_id).single(),
    m.plan_id ? db.from('provider_membership_plans').select('name, monthly_price').eq('id', m.plan_id).maybeSingle() : { data: null },
  ]);
  const lines = [
    `プラン：${plan?.name || '—'}${plan?.monthly_price ? `（月額 ¥${Number(plan.monthly_price).toLocaleString()}）` : ''}`,
    m.enrollment_date && `入会の希望日：${m.enrollment_date}`,
    m.phone && `電話番号：${m.phone}`,
    auto.membership
      ? '自動承認の設定により、入会が確定してお支払いが始まりました。申し込みの内容（本人確認書類など）は管理画面の「入会手続き」で確認できます。'
      : auto.tried
        ? `自動承認できませんでした（${auto.error}）。内容を確認して、管理画面から承認してください。`
        : 'カードの登録まで済んでいます。内容を確認して承認すると、入会が確定してお支払いが始まります。',
  ].filter(Boolean);
  const dashboardUrl = `${BASE}/provider/dashboard?tab=memberships`;
  if (providerRecipients(prov).length) {
    await sendMembershipRequestEmail({ to: providerRecipients(prov), providerName: prov.name, customerName, kindLabel: '入会', lines, dashboardUrl, approved: !!auto.membership });
  }
  if (prov?.line_user_id) {
    const head = auto.membership ? `${customerName}様がオンラインで入会しました（自動承認）。` : `${customerName}様からオンラインで入会の申し込みがありました。`;
    const tail = auto.membership ? '管理画面の「入会手続き」で内容を確認できます。' : '管理画面の「入会手続き」で承認してください。';
    await sendLinePush(prov.line_user_id, `【Fineme】${head}\n${lines.join('\n')}\n${tail}\n${dashboardUrl}`);
  }
}
