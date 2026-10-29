// /pos-pay/[id]/start の確認ページ用（公開・お客様のスマホ用。2026-10-29）。
// お店が会員証などでお客様を選んでから「お客様のスマホで払う」を出した時だけ、ここを通る。
// GET  → お店の名前・金額・お名前・このお店に保存済みのカード
// POST { save_card } → Stripeの決済ページを作って url を返す（save_card なら次回からお店のレジでこのカードで払える）
// 支払いの確定・カードの保存は webhook が行う（app/api/stripe/webhook/route.js）。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { priceItems } from '@/lib/pos-checkout';
import { createPosCheckoutSession, posLineName } from '@/lib/pos-online-session';
import { findSavedCard, stripeCustomerFor, cardLabel } from '@/lib/pos-member-card';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const LIFETIME_MS = 6 * 60 * 60 * 1000; // レジで出したQRを、何時間もあとに使わせない

async function load(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return null;
  const { data: pending } = await supabase.from('provider_pos_pending_checkouts').select('*').eq('id', id).maybeSingle();
  if (!pending?.customer?.user_id) return null;
  const { data: provider } = await supabase.from('providers').select('id, name, stripe_connect_id, stripe_connect_status').eq('id', pending.provider_id).single();
  return provider ? { pending, provider } : null;
}

const expired = p => Date.now() - new Date(p.created_at).getTime() > LIFETIME_MS;

export async function GET(request, { params }) {
  const { id } = await params;
  const x = await load(id);
  if (!x) return Response.json({ error: 'お支払いが見つかりません。お店のスタッフにお声がけください' }, { status: 404 });
  const { pending, provider } = x;
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
  const saved = pending.status === 'pending' ? await findSavedCard(supabase, stripe, provider.id, pending.customer.user_id) : null;
  return Response.json({
    status: expired(pending) && pending.status === 'pending' ? 'expired' : pending.status,
    store_name: provider.name,
    total_amount: pending.total_amount,
    customer_name: pending.customer.name || '',
    saved_card: saved ? cardLabel(saved) : null,
  });
}

export async function POST(request, { params }) {
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'ただいまカードでお支払いできません' }, { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { id } = await params;
  const x = await load(id);
  if (!x) return Response.json({ error: 'お支払いが見つかりません。お店のスタッフにお声がけください' }, { status: 404 });
  const { pending, provider } = x;
  if (pending.status !== 'pending') return Response.json({ error: 'このお会計は、もうお支払い済みか取り消されています', code: pending.status }, { status: 409 });
  if (expired(pending)) return Response.json({ error: '時間が経ったため、このQRコードは使えません。お店のスタッフにお声がけください', code: 'expired' }, { status: 410 });
  if (!provider.stripe_connect_id || provider.stripe_connect_status !== 'active') return Response.json({ error: 'このお店は、いまカードでのお支払いを受け付けていません' }, { status: 409 });
  const { save_card } = await request.json().catch(() => ({}));

  // 前に作った決済ページは閉じる（2つのページで二重に払えないように）。もう払われていたら新しく作らない
  if (pending.stripe_checkout_session_id) {
    try {
      const old = await stripe.checkout.sessions.retrieve(pending.stripe_checkout_session_id);
      if (old.status === 'complete') return Response.json({ error: 'このお会計は、もうお支払い済みです', code: 'paid' }, { status: 409 });
      if (old.status === 'open') await stripe.checkout.sessions.expire(old.id);
    } catch (e) { console.error('[pos-pay start] expire', e?.message); return Response.json({ error: 'お支払いの準備に失敗しました。もう一度お試しください' }, { status: 500 }); }
  }

  let priced;
  try { priced = await priceItems(supabase, provider.id, pending.items, pending.discount); } catch (e) { return Response.json({ error: e.message }, { status: 400 }); }
  try {
    const userId = pending.customer.user_id;
    const { data: { user } = {} } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: {} }));
    const email = user?.email && !/@line\.fineme\.me$|\.invalid$/.test(user.email) ? user.email : undefined;
    const customerId = await stripeCustomerFor(supabase, stripe, provider.id, userId, { email, name: pending.customer.name || undefined });
    const session = await createPosCheckoutSession(stripe, provider, pending, { lineName: posLineName(priced), customerId, saveCard: !!save_card });
    await supabase.from('provider_pos_pending_checkouts').update({ stripe_checkout_session_id: session.id }).eq('id', pending.id).eq('status', 'pending');
    return Response.json({ url: session.url });
  } catch (e) {
    console.error('[pos-pay start]', e);
    return Response.json({ error: 'お支払いの準備に失敗しました。時間をおいてもう一度お試しください' }, { status: 500 });
  }
}
