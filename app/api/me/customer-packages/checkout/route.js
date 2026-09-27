// POST /api/me/customer-packages/checkout → 回数券・パッケージのオンライン購入開始
// でお要望2026-09-27：決済機能（Phase 6）第一弾。入会手続き(membership)で実証済みの
// Stripe Connect destination charge方式を流用。チケットは月額と違い一回払いのため
// mode:'payment'のCheckout Sessionで即決済（membershipのmode:'setup'とは異なり、
// カード保存だけでなくこの場で課金まで完了する）。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { package_id } = await request.json().catch(() => ({}));
  if (!package_id) return Response.json({ error: 'package_idは必須です' }, { status: 400 });

  const { data: pkg } = await supabase.from('service_packages').select('*').eq('id', package_id).eq('active', true).single();
  if (!pkg) return Response.json({ error: 'チケットが見つかりません' }, { status: 404 });
  if (pkg.package_type === 'subscription') return Response.json({ error: 'このチケットはオンライン購入に対応していません' }, { status: 400 });
  if (!pkg.price) return Response.json({ error: '金額が設定されていません' }, { status: 409 });

  const { data: provider } = await supabase.from('providers').select('id, slug, name, stripe_connect_id, stripe_connect_status').eq('id', pkg.provider_id).single();
  if (!provider) return Response.json({ error: '店舗が見つかりません' }, { status: 404 });
  if (!provider.stripe_connect_id || provider.stripe_connect_status !== 'active') {
    return Response.json({ error: 'この店舗はまだオンライン決済の受け入れ準備が完了していません' }, { status: 409 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email || undefined,
      line_items: [{
        price_data: { currency: 'jpy', product_data: { name: `${provider.name}：${pkg.name}` }, unit_amount: pkg.price },
        quantity: 1,
      }],
      payment_intent_data: {
        transfer_data: { destination: provider.stripe_connect_id },
        metadata: { fineme_user_id: user.id, fineme_provider_id: provider.id, fineme_package_id: pkg.id },
      },
      metadata: { fineme_user_id: user.id, fineme_provider_id: provider.id, fineme_package_id: pkg.id },
      success_url: `${BASE_URL}/provider/${provider.slug}?tab=packages&purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/provider/${provider.slug}?tab=packages&purchase=cancel`,
    });
    return Response.json({ url: session.url });
  } catch (e) {
    console.error('[customer-packages checkout]', e);
    return Response.json({ error: 'Stripeでの手続き開始に失敗しました: ' + e.message }, { status: 500 });
  }
}
