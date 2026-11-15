// POST /api/mirror/purchase
// Fineme Mirror フル版 ¥500 の Stripe Checkout セッションを作成
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

function getBaseUrl(request) {
  const host = request.headers.get('host') || 'www.fineme.me';
  const proto = host.includes('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}

export async function POST(request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return Response.json({ error: 'Stripe未設定' }, { status: 503 });

  try {
    const { session_id } = await request.json();
    if (!session_id) return Response.json({ error: 'session_id は必須です' }, { status: 400 });

    // セッション存在確認
    const { data: mirrorSession } = await supabase
      .from('mirror_sessions')
      .select('id, paid')
      .eq('id', session_id)
      .single();

    if (!mirrorSession) return Response.json({ error: 'セッションが見つかりません' }, { status: 404 });
    if (mirrorSession.paid) return Response.json({ error: 'すでに購入済みです' }, { status: 409 });

    const stripe = new Stripe(stripeKey);
    const baseUrl = getBaseUrl(request);

    // 2026-11-15：カードに加えて PayPay でも払えるようにする（Stripe の PayPay は単発の支払いのみ・
    // 決済仲介(Connect)では使えないため、Fineme が直接受け取る Mirror 単発だけが対象）。
    // Stripe の管理画面で PayPay が有効になっていない・使えない時は作成が失敗するので、その時はカードだけで作り直す。
    const params = {
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: 'Fineme Mirror — New Me Log フル版',
            description: '7軸の詳細分析・具体的改善ヒント・Me ScanのCompassアクション提案',
          },
          unit_amount: 500,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}/mirror?session_id=${session_id}&purchased=1`,
      cancel_url: `${baseUrl}/mirror?session_id=${session_id}`,
      metadata: { mirror_session_id: session_id },
    };
    let checkout;
    try {
      checkout = await stripe.checkout.sessions.create({ ...params, payment_method_types: ['card', 'paypay'] });
    } catch (e) {
      console.warn('[mirror purchase] PayPay unavailable, falling back to card only:', e?.message);
      checkout = await stripe.checkout.sessions.create({ ...params, payment_method_types: ['card'] });
    }

    // checkout session IDをmirror_sessionsに保存
    await supabase
      .from('mirror_sessions')
      .update({ stripe_checkout_session_id: checkout.id })
      .eq('id', session_id);

    return Response.json({ url: checkout.url });
  } catch (e) {
    console.error('mirror purchase error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
