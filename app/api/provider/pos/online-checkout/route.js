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

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, name, stripe_connect_id, stripe_connect_status').eq('email', user.email).single();
  return data || null;
}

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!provider.stripe_connect_id || provider.stripe_connect_status !== 'active') {
    return Response.json({ error: 'オンライン決済の受け入れ準備が完了していません（課金・プランタブから設定してください）' }, { status: 409 });
  }

  const { items, staff_id, memo } = await request.json().catch(() => ({}));
  if (!Array.isArray(items) || !items.length) return Response.json({ error: '会計する商品がありません' }, { status: 400 });

  // 明細の検証・金額計算だけここで行う（在庫引き当て・記録は支払い確定後）
  const productIds = [...new Set(items.filter(it => it.product_id).map(it => it.product_id))];
  let productMap = {};
  if (productIds.length) {
    const { data: products } = await supabase.from('provider_products').select('id, name, price, track_stock, stock_qty').eq('provider_id', provider.id).in('id', productIds);
    (products || []).forEach(p => { productMap[p.id] = p; });
  }
  let totalAmount = 0;
  const lineItemsForStripe = [];
  for (const it of items) {
    const qty = parseInt(it.qty, 10);
    if (!Number.isInteger(qty) || qty <= 0) return Response.json({ error: '数量が不正です' }, { status: 400 });
    const product = it.product_id ? productMap[it.product_id] : null;
    if (it.product_id && !product) return Response.json({ error: '商品が見つかりません' }, { status: 404 });
    if (product?.track_stock && product.stock_qty < qty) {
      return Response.json({ error: `${product.name}の在庫が不足しています（残り${product.stock_qty}）` }, { status: 400 });
    }
    const unitPrice = product ? product.price : (Number.isFinite(parseInt(it.unit_price, 10)) ? parseInt(it.unit_price, 10) : 0);
    const name = product ? product.name : (it.name?.trim() || '商品');
    totalAmount += unitPrice * qty;
    lineItemsForStripe.push({ price_data: { currency: 'jpy', product_data: { name }, unit_amount: unitPrice }, quantity: qty });
  }
  if (totalAmount <= 0) return Response.json({ error: '合計金額は1円以上にしてください' }, { status: 400 });

  const { data: pending, error: pendingError } = await supabase
    .from('provider_pos_pending_checkouts')
    .insert({ provider_id: provider.id, items, staff_id: staff_id || null, memo: memo?.trim() || null, total_amount: totalAmount })
    .select()
    .single();
  if (pendingError) return Response.json({ error: pendingError.message }, { status: 500 });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItemsForStripe,
      payment_intent_data: {
        transfer_data: { destination: provider.stripe_connect_id },
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
    return Response.json({ error: 'Stripeでの手続き開始に失敗しました: ' + e.message }, { status: 500 });
  }
}
