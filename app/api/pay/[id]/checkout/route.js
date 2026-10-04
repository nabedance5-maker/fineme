// POST /api/pay/[id]/checkout → 請求のカード決済ページ（Stripe Checkout）へのURLを発行（公開）
// 代金は店舗のStripe Connectアカウントへ送られる。入金の確定はStripe Webhook
// （checkout.session.completed の fineme_invoice_id）が行う。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { BASE_URL } from '@/lib/invoices';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function POST(request, { params }) {
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: '現在お支払いを受け付けできません' }, { status: 503 });
  const { id } = await params;
  const { data: inv } = await supabase.from('provider_invoices').select('id, provider_id, title, amount, status').eq('id', id).maybeSingle();
  if (!inv) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (inv.status !== 'unpaid') return Response.json({ error: 'この請求はお支払いできません' }, { status: 409 });

  const { data: provider } = await supabase.from('providers').select('name, stripe_connect_id, stripe_connect_status').eq('id', inv.provider_id).single();
  if (!provider?.stripe_connect_id || provider.stripe_connect_status !== 'active') {
    return Response.json({ error: 'この店舗はオンラインでのお支払いに対応していません。店舗にお問い合わせください' }, { status: 409 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price_data: { currency: 'jpy', product_data: { name: `${provider.name}：${inv.title}` }, unit_amount: inv.amount }, quantity: 1 }],
      payment_intent_data: {
        transfer_data: { destination: provider.stripe_connect_id },
        metadata: { fineme_provider_id: inv.provider_id, fineme_invoice_id: inv.id },
      },
      metadata: { fineme_provider_id: inv.provider_id, fineme_invoice_id: inv.id },
      success_url: `${BASE_URL}/pay/${inv.id}?paid=1`,
      cancel_url: `${BASE_URL}/pay/${inv.id}`,
    });
    await supabase.from('provider_invoices').update({ stripe_checkout_session_id: session.id }).eq('id', inv.id);
    return Response.json({ url: session.url });
  } catch (e) {
    console.error('[pay checkout]', e);
    return Response.json({ error: 'お支払いの手続きを開始できませんでした' }, { status: 500 });
  }
}
