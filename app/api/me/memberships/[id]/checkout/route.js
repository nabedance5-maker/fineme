// POST /api/me/memberships/[id]/checkout → カード登録用のStripe Checkoutセッションを作成
// mode:'setup' のため、この時点ではまだ課金されない（カードの保存のみ＝仮契約の準備）。
// 実際の初回課金は店舗の承認時（/api/provider/memberships/[id]/approve）に発生する。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

export async function POST(request, { params }) {
  const { id } = await params;
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: m } = await supabase.from('provider_memberships').select('*').eq('id', id).single();
  if (!m || m.user_id !== user.id) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (m.status !== 'draft') return Response.json({ error: 'この申込は既に手続きが進んでいます' }, { status: 409 });

  const { data: settings } = await supabase.from('provider_membership_settings').select('require_id_document').eq('provider_id', m.provider_id).maybeSingle();
  if ((settings?.require_id_document ?? true) && !m.id_document_path) {
    return Response.json({ error: '本人確認書類のアップロードが必要です' }, { status: 400 });
  }

  const { data: providerSlugRow } = await supabase.from('providers').select('slug').eq('id', m.provider_id).single();
  const slug = providerSlugRow?.slug;

  try {
    let customerId = m.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${m.last_name} ${m.first_name}`,
        phone: m.phone || undefined,
        metadata: { fineme_user_id: user.id, fineme_membership_id: m.id, fineme_provider_id: m.provider_id },
      });
      customerId = customer.id;
      await supabase.from('provider_memberships').update({ stripe_customer_id: customerId }).eq('id', id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      success_url: `${BASE_URL}/provider/${slug}/join?membership=${id}&setup=success`,
      cancel_url: `${BASE_URL}/provider/${slug}/join?membership=${id}&setup=cancel`,
    });

    await supabase.from('provider_memberships').update({ stripe_checkout_session_id: session.id }).eq('id', id);
    return Response.json({ url: session.url });
  } catch (e) {
    console.error('[memberships checkout]', e);
    return Response.json({ error: 'Stripeでの手続き開始に失敗しました: ' + e.message }, { status: 500 });
  }
}
