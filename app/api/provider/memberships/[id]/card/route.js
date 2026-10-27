// POST /api/provider/memberships/[id]/card → 店頭で始めた入会の、カード登録用のStripe Checkoutを作る（でお要望 2026-10-27）
// mode:'setup'のため、この時点ではまだ課金しない（カードの保存のみ）。返したURLを、店頭の端末で開くか、QR・リンクでお客様に渡す。
// Checkoutのページはお客様がFinemeにログインしていなくても使える。課金は店舗の確定（approve）で始まる。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { membershipAuth } from '@/lib/provider-members';
import { withAudit } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

async function __POST(request, { params }) {
  const { id } = await params;
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const auth = await membershipAuth(request);
  if (auth.res) return auth.res;

  const { data: m } = await supabase.from('provider_memberships').select('*').eq('id', id).eq('provider_id', auth.provider.id).maybeSingle();
  if (!m) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (!m.created_by_store) return Response.json({ error: 'お客様が自分で申し込んだ入会です。カード登録はお客様の画面で行われます' }, { status: 409 });
  if (m.status !== 'draft') return Response.json({ error: 'この入会はすでにカード登録が済んでいます' }, { status: 409 });

  try {
    let customerId = m.stripe_customer_id;
    if (!customerId) {
      // 届かないアドレス（店頭だけのお客様用に作ったアカウント）はStripeに渡さない
      const { data: au } = await supabase.auth.admin.getUserById(m.user_id);
      const email = au?.user?.email && !au.user.email.endsWith('.invalid') ? au.user.email : undefined;
      const customer = await stripe.customers.create({
        email,
        name: `${m.last_name || ''} ${m.first_name || ''}`.trim() || undefined,
        phone: m.phone || undefined,
        metadata: { fineme_user_id: m.user_id, fineme_membership_id: m.id, fineme_provider_id: m.provider_id },
      });
      customerId = customer.id;
      await supabase.from('provider_memberships').update({ stripe_customer_id: customerId }).eq('id', id);
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      success_url: `${BASE_URL}/card-registered?status=success`,
      cancel_url: `${BASE_URL}/card-registered?status=cancel`,
    });
    await supabase.from('provider_memberships').update({ stripe_checkout_session_id: session.id }).eq('id', id);
    return Response.json({ url: session.url });
  } catch (e) {
    console.error('[memberships card]', e);
    return Response.json({ error: 'カード登録の案内を作れませんでした: ' + e.message }, { status: 500 });
  }
}
export const POST = withAudit(__POST);
