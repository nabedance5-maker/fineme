// POST /api/provider/pos/online-checkout → お客様のスマホで支払うオンライン決済リンクを発行
// でお要望2026-09-27：決済機能（Phase 6）②POS決済。POSはFineme未登録の来店客
// （walk-in）も対象になるため、入会・回数券購入のような「ログイン中の本人が
// success_urlに戻ってきて確定」方式が使えない。Stripe Webhook駆動で確定する
// （app/api/stripe/webhook/route.jsのcheckout.session.completedを参照）。
// 決済が確定するまではprovider_pos_transactions等には一切書き込まない
// （provider_pos_pending_checkoutsに一時保存し、支払い確認後にrecordPosTransactionへ）。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { priceItems } from '@/lib/pos-checkout';
import { applicationFeeAmount } from '@/lib/payment-fee';
import { planLockedResponse } from '@/lib/plan-features';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, name, stripe_connect_id, stripe_connect_status, plan').eq('email', user.email).single();
  return data || null;
}

async function __POST(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'pos'); if (locked) return locked; }
  if (!provider.stripe_connect_id || provider.stripe_connect_status !== 'active') {
    return Response.json({ error: 'カード決済の受け取り設定が完了していません（「Fineme利用契約」タブ上部の「カード決済の受け取り設定」から設定できます）' }, { status: 409 });
  }

  const { items, staff_id, memo, discount, customer } = await request.json().catch(() => ({}));
  // 明細の検証・金額計算だけここで行う（在庫引き当て・記録は支払い確定後）。会計確定と同じ計算を使う
  let priced;
  try { priced = await priceItems(supabase, provider.id, items, discount); } catch (e) { return Response.json({ error: e.message }, { status: 400 }); }
  const totalAmount = priced.totalAmount;
  const lineItemsForStripe = [{ price_data: { currency: 'jpy', product_data: { name: priced.lineItems.length === 1 ? priced.lineItems[0].name_snapshot : `お会計（${priced.lineItems.length}点${priced.cartOff ? '・割引あり' : ''}）` }, unit_amount: totalAmount }, quantity: 1 }];

  const { data: pending, error: pendingError } = await supabase
    .from('provider_pos_pending_checkouts')
    .insert({ provider_id: provider.id, items, staff_id: staff_id || null, memo: memo?.trim() || null, total_amount: totalAmount, discount: discount || null, customer: customer || null })
    .select()
    .single();
  if (pendingError) return Response.json({ error: pendingError.message }, { status: 500 });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItemsForStripe,
      payment_intent_data: {
        transfer_data: { destination: provider.stripe_connect_id },
        application_fee_amount: applicationFeeAmount(totalAmount),
        metadata: { fineme_provider_id: provider.id, fineme_pos_pending_id: pending.id },
      },
      metadata: { fineme_provider_id: provider.id, fineme_pos_pending_id: pending.id },
      success_url: `${BASE_URL}/pos-pay/${pending.id}?paid=1`,
      cancel_url: `${BASE_URL}/pos-pay/${pending.id}?paid=0`,
    });
    await supabase.from('provider_pos_pending_checkouts').update({ stripe_checkout_session_id: session.id }).eq('id', pending.id);
    return Response.json({ pending_id: pending.id, url: session.url });
  } catch (e) {
    console.error('[pos online-checkout]', e);
    return Response.json({ error: 'オンライン決済の準備に失敗しました。時間をおいてもう一度お試しください' }, { status: 500 });
  }
}

export const POST = withAudit(__POST);
