// GET  /api/provider/membership-billing → 月会費の支払い状況（会員ごとの状態・直近の請求・カード・次回の引き落とし日）
// POST /api/provider/membership-billing { action: 'retry', payment_id } → 失敗した月会費をもう一度引き落とす
// POST /api/provider/membership-billing { action: 'card_link', membership_id } → カード更新のリンクを作り、LINEで送る
// でお要望（2026-10-19）：hacomonoの「月会費支払状況」（決済エラー・カード決済予定）相当。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { sendLinePushWithAction } from '@/lib/line-push';
import { resolveLineTarget } from '@/lib/line-channel';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';
const stripe = () => (process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null);

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: ms } = await supabase.from('provider_memberships')
    .select('id, user_id, plan_id, status, payment_status, last_name, first_name, phone, enrollment_date, last_paid_at, last_failed_at, stripe_subscription_id, stripe_payment_method_id')
    .eq('provider_id', a.provider.id).in('status', ['active', 'pending_approval', 'cancelled']).order('created_at', { ascending: false });
  const list = ms || [];
  const ids = list.map(m => m.id);
  const planIds = [...new Set(list.map(m => m.plan_id).filter(Boolean))];
  const [{ data: pays }, { data: plans }] = await Promise.all([
    ids.length ? supabase.from('provider_membership_payments').select('id, membership_id, amount, status, period_start, failure_message, attempt_count, next_attempt_at, paid_at, created_at').in('membership_id', ids).order('created_at', { ascending: false }).limit(1000) : { data: [] },
    planIds.length ? supabase.from('provider_membership_plans').select('id, name, monthly_price').in('id', planIds) : { data: [] },
  ]);
  const planOf = Object.fromEntries((plans || []).map(p => [p.id, p]));
  const s = stripe();
  // カードと次回の引き落とし日はStripeから（入会中の人だけ・多すぎる時は先頭から）
  const live = await Promise.all(list.map(async (m, i) => {
    if (!s || m.status !== 'active' || i >= 60) return {};
    const out = {};
    try {
      if (m.stripe_subscription_id) {
        const sub = await s.subscriptions.retrieve(m.stripe_subscription_id);
        const end = sub.current_period_end || sub.items?.data?.[0]?.current_period_end;
        out.next_charge_date = end ? new Date(end * 1000 + 9 * 3600000).toISOString().slice(0, 10) : null;
        out.sub_status = sub.status;
      }
      if (m.stripe_payment_method_id) {
        const pm = await s.paymentMethods.retrieve(m.stripe_payment_method_id);
        if (pm?.card) out.card = { brand: pm.card.brand, last4: pm.card.last4, exp_month: pm.card.exp_month, exp_year: pm.card.exp_year };
      }
    } catch { /* Stripeに繋がらない時は表示だけ省く */ }
    return out;
  }));
  return Response.json({
    members: list.map((m, i) => ({
      id: m.id, user_id: m.user_id, name: [m.last_name, m.first_name].filter(Boolean).join(' '), phone: m.phone,
      plan: planOf[m.plan_id]?.name || '会員プラン', monthly_price: planOf[m.plan_id]?.monthly_price ?? null,
      status: m.status, payment_status: m.payment_status, enrollment_date: m.enrollment_date,
      last_paid_at: m.last_paid_at, last_failed_at: m.last_failed_at,
      ...live[i],
      payments: (pays || []).filter(p => p.membership_id === m.id).slice(0, 12),
    })),
  });
}

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const s = stripe();
  if (!s) return Response.json({ error: 'カード決済は現在利用できません' }, { status: 503 });
  const body = await request.json().catch(() => ({}));

  if (body.action === 'retry') {
    const { data: p } = await supabase.from('provider_membership_payments').select('id, stripe_invoice_id, status').eq('id', body.payment_id).eq('provider_id', a.provider.id).maybeSingle();
    if (!p) return Response.json({ error: '請求が見つかりません' }, { status: 404 });
    if (p.status === 'paid') return Response.json({ error: 'この月会費は支払い済みです' }, { status: 409 });
    try {
      const inv = await s.invoices.pay(p.stripe_invoice_id);
      return Response.json({ ok: true, paid: inv.status === 'paid' });
    } catch (e) {
      console.error('[membership-billing retry]', e.message);
      return Response.json({ error: e?.code === 'card_declined' || e?.type === 'StripeCardError' ? 'カードが使えず引き落とせませんでした。お客様にカードの更新をお願いしてください' : '引き落とせませんでした。時間をおいてもう一度お試しください' }, { status: 402 });
    }
  }

  if (body.action === 'card_link') {
    const { data: m } = await supabase.from('provider_memberships').select('id, user_id, stripe_customer_id, last_name, first_name').eq('id', body.membership_id).eq('provider_id', a.provider.id).maybeSingle();
    if (!m?.stripe_customer_id) return Response.json({ error: 'このお客様はカードが登録されていません' }, { status: 400 });
    const { data: prov } = await supabase.from('providers').select('id, slug, name, line_user_id').eq('id', a.provider.id).single();
    const session = await s.checkout.sessions.create({
      mode: 'setup',
      customer: m.stripe_customer_id,
      payment_method_types: ['card'],
      metadata: { fineme_membership_card_update: m.id, fineme_provider_id: prov.id },
      success_url: `${BASE}/provider/${prov.slug}?card_update=success`,
      cancel_url: `${BASE}/provider/${prov.slug}?card_update=cancel`,
    });
    let sent = false;
    if (m.user_id) {
      try {
        const { data: profile } = await supabase.from('profiles').select('line_user_id').eq('id', m.user_id).maybeSingle();
        const target = await resolveLineTarget(supabase, { providerId: prov.id, userId: m.user_id, fallbackLineUserId: profile?.line_user_id || null });
        if (target?.lineUserId) {
          const r = await sendLinePushWithAction(target.lineUserId, `${prov.name}より：月会費のお支払いに使うカードの更新をお願いします。下のボタンから新しいカードを登録してください（未払いの月会費は登録後に自動で引き落とされます）。`, { label: 'カードを更新する', caption: 'お手続きは1分ほどで終わります', uri: session.url }, target.token);
          sent = r?.ok !== false;
        }
      } catch { /* 送れなくてもリンクは返す */ }
    }
    return Response.json({ ok: true, url: session.url, sent });
  }
  return Response.json({ error: '操作が正しくありません' }, { status: 400 });
}
export const POST = withAudit(__POST);
