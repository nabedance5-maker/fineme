// POST /api/provider/pos/card-checkout → 会員証で呼び出したお客様の、登録済みのカードでお会計する（2026-10-28）。
// その場でカードに請求し（Stripe・お店へ直接入金、Finemeの手数料はほかの決済と同じ）、払えた時だけ会計を記録する。
// 記録に失敗したら、請求したお金はすぐに返金する（お金だけ取って会計が残らない状態を作らない）。
// カードの本人確認（3Dセキュア）が要る時などは払えないので、「お客様のスマホで払う（QR）」に切り替えてもらう。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { planLockedResponse } from '@/lib/plan-features';
import { priceItems, recordPosTransaction } from '@/lib/pos-checkout';
import { applicationFeeAmount } from '@/lib/payment-fee';
import { findMemberCard, cardLabel } from '@/lib/pos-member-card';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: provider } = await supabase.from('providers').select('id, name, plan, stripe_connect_id, stripe_connect_status').eq('id', a.provider.id).single();
  { const locked = planLockedResponse(provider, 'pos'); if (locked) return locked; }
  if (!provider.stripe_connect_id || provider.stripe_connect_status !== 'active') {
    return Response.json({ error: 'カード決済の受け取り設定が完了していません（「Fineme利用契約」タブ上部の「カード決済の受け取り設定」から設定できます）' }, { status: 409 });
  }

  const { items, staff_id, memo, discount, customer, request_id } = await request.json().catch(() => ({}));
  if (!customer?.user_id) return Response.json({ error: 'お客様を選んでください（会員証を読み取るか、お客様を選ぶ）' }, { status: 400 });
  if (!/^[0-9a-f-]{36}$/i.test(request_id || '')) return Response.json({ error: '会計の番号が正しくありません。画面を開き直してください' }, { status: 400 });

  let priced;
  try { priced = await priceItems(supabase, provider.id, items, discount); } catch (e) { return Response.json({ error: e.message }, { status: 400 }); }
  if (priced.totalAmount < 50) return Response.json({ error: 'カードで払えるのは50円からです' }, { status: 400 });
  const card = await findMemberCard(supabase, stripe, provider.id, customer.user_id);
  if (!card) return Response.json({ error: 'このお客様は、このお店で使える登録済みのカードがありません。「お客様のスマホで払う（QR）」をお使いください', code: 'no_card' }, { status: 409 });

  const { data: { user } = {} } = await supabase.auth.admin.getUserById(customer.user_id).catch(() => ({ data: {} }));
  const email = user?.email && !/@line\.fineme\.me$|\.invalid$/.test(user.email) ? user.email : undefined;

  let pi;
  try {
    pi = await stripe.paymentIntents.create({
      amount: priced.totalAmount, currency: 'jpy',
      customer: card.customerId, payment_method: card.paymentMethodId,
      off_session: true, confirm: true,
      description: `${provider.name} お会計`,
      receipt_email: email, // お客様にStripeから領収のメールが届く（知らない請求にならないように）
      transfer_data: { destination: provider.stripe_connect_id },
      application_fee_amount: applicationFeeAmount(priced.totalAmount),
      metadata: { fineme_provider_id: provider.id, fineme_pos_card: '1', fineme_user_id: customer.user_id },
    }, { idempotencyKey: `pos-card-${request_id}` }); // ボタンの二度押し・通信のやり直しで二重に請求しない
  } catch (e) {
    const need3ds = e?.code === 'authentication_required' || e?.raw?.payment_intent?.status === 'requires_action';
    return Response.json({
      error: need3ds ? 'このカードはご本人の確認が必要なため、ここでは払えません。「お客様のスマホで払う（QR）」をお使いください' : `カードで払えませんでした（${e?.raw?.decline_code === 'insufficient_funds' ? '残高・利用枠が足りません' : e.message}）。別の払い方をお選びください`,
      code: need3ds ? 'authentication_required' : 'card_declined',
    }, { status: 402 });
  }
  if (pi.status !== 'succeeded') return Response.json({ error: 'カードの支払いが完了しませんでした。別の払い方をお選びください' }, { status: 402 });

  // 二度押しで同じ支払いが返ってきた時は、記録済みの会計を返す
  const { data: done } = await supabase.from('provider_pos_transactions').select('*').eq('provider_id', provider.id).eq('stripe_payment_intent_id', pi.id).maybeSingle();
  if (done) return Response.json({ transaction: done, card_label: cardLabel(card) });

  try {
    const result = await recordPosTransaction(supabase, {
      providerId: provider.id, items, staffId: staff_id, memo, discount, customer,
      paymentMethod: `登録カード（${cardLabel(card)}）`, source: 'pos_card',
      operator: a.user.fineme_member?.name || 'オーナー', stripePaymentIntentId: pi.id,
    });
    return Response.json({ ...result, card_label: cardLabel(card) });
  } catch (e) {
    try { await stripe.refunds.create({ payment_intent: pi.id, reverse_transfer: true, refund_application_fee: true }, { idempotencyKey: `pos-card-undo-${pi.id}` }); } catch (re) { console.error('[pos card-checkout refund]', re?.message); }
    return Response.json({ error: `会計を記録できなかったため、カードへの請求は取り消しました（${e.message}）` }, { status: 400 });
  }
}

export const POST = withAudit(__POST);
