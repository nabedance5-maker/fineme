// POST /api/provider/memberships/[id]/card/confirm → お客様がカードを登録できたか確かめ、できていれば確定待ち（pending_approval）に進める
// 店舗の画面が数秒ごとに呼ぶ。お客様のログインは要らない（店舗の操作として確認する）。ここでもまだ課金しない。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { membershipAuth } from '@/lib/provider-members';
import { logCustomerActivity } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function POST(request, { params }) {
  const { id } = await params;
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const auth = await membershipAuth(request);
  if (auth.res) return auth.res;

  const { data: m } = await supabase.from('provider_memberships').select('*').eq('id', id).eq('provider_id', auth.provider.id).maybeSingle();
  if (!m) return Response.json({ error: '見つかりません' }, { status: 404 });
  if (m.status !== 'draft') return Response.json({ status: m.status, registered: m.status !== 'draft' });
  if (!m.stripe_checkout_session_id) return Response.json({ status: 'draft', registered: false });

  try {
    const session = await stripe.checkout.sessions.retrieve(m.stripe_checkout_session_id, { expand: ['setup_intent'] });
    const pm = session.setup_intent?.payment_method;
    if (session.status !== 'complete' || !pm) return Response.json({ status: 'draft', registered: false });
    const { data: updated, error } = await supabase.from('provider_memberships')
      .update({ status: 'pending_approval', stripe_payment_method_id: typeof pm === 'string' ? pm : pm.id, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    await logCustomerActivity({
      providerId: updated.provider_id, userId: updated.user_id,
      name: [m.last_name, m.first_name].filter(Boolean).join(' '),
      label: '店頭の入会手続きでカードを登録', category: '顧客', targetId: id,
    });
    return Response.json({ status: 'pending_approval', registered: true });
  } catch (e) {
    console.error('[memberships card confirm]', e);
    return Response.json({ error: '確認できませんでした: ' + e.message }, { status: 500 });
  }
}
