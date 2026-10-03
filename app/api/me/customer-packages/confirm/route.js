// POST /api/me/customer-packages/confirm → Stripe Checkout(payment)完了後の確定処理
// success_urlに戻ってきた時に呼ぶ。支払い済みを確認してからcustomer_packagesを作成する。
// 二重実行はstripe_checkout_session_idのユニークインデックスで防ぐ（でお指摘の反省を
// 踏まえ、membershipのconfirm-setupと同じ「戻ってきた時に確定」パターンを踏襲）。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { logCustomerActivity } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { session_id } = await request.json().catch(() => ({}));
  if (!session_id) return Response.json({ error: 'session_idは必須です' }, { status: 400 });

  // 二重呼び出し対策：既にこのセッションで作成済みならそれをそのまま返す
  const { data: existing } = await supabase.from('customer_packages').select('*').eq('stripe_checkout_session_id', session_id).maybeSingle();
  if (existing) return Response.json(existing);

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') return Response.json({ error: '決済が完了していません' }, { status: 409 });
    if (session.metadata?.fineme_user_id !== user.id) return Response.json({ error: '権限がありません' }, { status: 403 });

    const providerId = session.metadata?.fineme_provider_id;
    const packageId = session.metadata?.fineme_package_id;
    const { data: pkg } = await supabase.from('service_packages').select('*').eq('id', packageId).single();
    if (!pkg) return Response.json({ error: 'チケット定義が見つかりません' }, { status: 404 });

    const expires_at = pkg.validity_days
      ? new Date(Date.now() + pkg.validity_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: created, error } = await supabase
      .from('customer_packages')
      .insert({
        provider_id: providerId,
        package_id: pkg.id,
        user_id: user.id,
        package_name: pkg.name,
        total_sessions: pkg.total_sessions,
        package_type: pkg.package_type || 'fixed_count',
        expires_at,
        stripe_checkout_session_id: session_id,
      })
      .select()
      .single();
    if (error) {
      // ユニーク制約違反＝ちょうど同時に二重実行された。既存行を返す。
      if (error.code === '23505') {
        const { data: raced } = await supabase.from('customer_packages').select('*').eq('stripe_checkout_session_id', session_id).maybeSingle();
        if (raced) return Response.json(raced);
      }
      return Response.json({ error: error.message }, { status: 500 });
    }
    const { data: buyer } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
    await logCustomerActivity({
      providerId, userId: user.id, name: buyer?.display_name,
      label: 'お客様が回数券を購入', category: '顧客', targetId: created.id,
      detail: { package_name: pkg.name, total_sessions: pkg.total_sessions },
    });
    return Response.json(created, { status: 201 });
  } catch (e) {
    console.error('[customer-packages confirm]', e);
    return Response.json({ error: '確認に失敗しました: ' + e.message }, { status: 500 });
  }
}
