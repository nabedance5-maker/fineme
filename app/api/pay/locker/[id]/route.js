// GET  /api/pay/locker/[id] → ロッカー代の支払いページ用（公開・ログイン不要。契約IDは推測できないUUID）
// POST /api/pay/locker/[id] → Stripeの決済ページ（毎月の引き落とし）を作って url を返す（2026-10-29）
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { awaitingPayment, createLockerCheckout } from '@/lib/locker-pay';
import { stripeCustomerFor } from '@/lib/pos-member-card';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function load(id) {
  if (!/^[0-9a-f-]{36}$/i.test(id || '')) return null;
  const { data: contract } = await supabase.from('provider_locker_contracts').select('*').eq('id', id).maybeSingle();
  if (!contract?.payment_link_url) return null;
  const [{ data: locker }, { data: provider }] = await Promise.all([
    supabase.from('provider_lockers').select('*').eq('id', contract.locker_id).single(),
    supabase.from('providers').select('id, name, stripe_connect_id, stripe_connect_status').eq('id', contract.provider_id).single(),
  ]);
  return locker && provider ? { contract, locker, provider } : null;
}

const stateOf = c => (c.status !== 'active' ? 'cancelled' : awaitingPayment(c) ? 'unpaid' : 'paid');

export async function GET(request, { params }) {
  const { id } = await params;
  const x = await load(id);
  if (!x) return Response.json({ error: 'お支払いが見つかりません' }, { status: 404 });
  return Response.json({ status: stateOf(x.contract), store_name: x.provider.name, locker_name: x.locker.name, monthly_fee: x.contract.monthly_fee, contractor_name: x.contract.contractor_name });
}

export async function POST(request, { params }) {
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'ただいまカードでお支払いできません' }, { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { id } = await params;
  const x = await load(id);
  if (!x) return Response.json({ error: 'お支払いが見つかりません' }, { status: 404 });
  const { contract, locker, provider } = x;
  const st = stateOf(contract);
  if (st !== 'unpaid') return Response.json({ error: st === 'paid' ? 'このロッカーは、もうお支払いの登録が済んでいます' : 'このロッカーの契約は終了しています。お店にお問い合わせください', code: st }, { status: 409 });
  if (!provider.stripe_connect_id || provider.stripe_connect_status !== 'active') return Response.json({ error: 'このお店は、いまカードでのお支払いを受け付けていません' }, { status: 409 });

  // 前に作った決済ページは閉じる（二重に申し込めないように）。もう払われていたら新しく作らない
  if (contract.stripe_checkout_session_id) {
    try {
      const old = await stripe.checkout.sessions.retrieve(contract.stripe_checkout_session_id);
      if (old.status === 'complete') return Response.json({ error: 'お支払いの登録が済んでいます。反映まで少しお待ちください', code: 'paid' }, { status: 409 });
      if (old.status === 'open') await stripe.checkout.sessions.expire(old.id);
    } catch (e) { console.error('[locker pay] expire', e?.message); return Response.json({ error: 'お支払いの準備に失敗しました。もう一度お試しください' }, { status: 500 }); }
  }
  try {
    let customerId = null;
    if (contract.user_id) {
      const { data: { user } = {} } = await supabase.auth.admin.getUserById(contract.user_id).catch(() => ({ data: {} }));
      const email = user?.email && !/@line\.fineme\.me$|\.invalid$/.test(user.email) ? user.email : undefined;
      customerId = await stripeCustomerFor(supabase, stripe, provider.id, contract.user_id, { email, name: contract.contractor_name });
    }
    const session = await createLockerCheckout(supabase, stripe, { contract, locker, provider, customerId });
    await supabase.from('provider_locker_contracts').update({ stripe_checkout_session_id: session.id }).eq('id', contract.id);
    return Response.json({ url: session.url });
  } catch (e) {
    console.error('[locker pay]', e);
    return Response.json({ error: 'お支払いの準備に失敗しました。時間をおいてもう一度お試しください' }, { status: 500 });
  }
}
