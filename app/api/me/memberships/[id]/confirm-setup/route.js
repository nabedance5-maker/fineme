// POST /api/me/memberships/[id]/confirm-setup → Stripe Checkout(setup)完了後の確定処理
// success_urlに戻ってきた時に呼ぶ。カードの保存を確認し、仮契約（pending_approval）に
// 進める。ここではまだ課金しない——課金は店舗の承認時（でお要望2026-09-15：
// 「スマホ上での入力が終わると仮契約の状態になる」「店舗側で承認・完了処理を行う」）。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

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
  if (m.status === 'pending_approval' || m.status === 'active') return Response.json(m); // 既に確定済み（二重呼び出し対策）
  if (!m.stripe_checkout_session_id) return Response.json({ error: '決済手続きが開始されていません' }, { status: 409 });

  try {
    const session = await stripe.checkout.sessions.retrieve(m.stripe_checkout_session_id, { expand: ['setup_intent'] });
    if (session.status !== 'complete' || !session.setup_intent?.payment_method) {
      return Response.json({ error: 'カードの登録が完了していません' }, { status: 409 });
    }
    const paymentMethodId = session.setup_intent.payment_method;

    const { data: updated, error } = await supabase
      .from('provider_memberships')
      .update({ status: 'pending_approval', stripe_payment_method_id: paymentMethodId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(updated);
  } catch (e) {
    console.error('[memberships confirm-setup]', e);
    return Response.json({ error: '確認に失敗しました: ' + e.message }, { status: 500 });
  }
}
