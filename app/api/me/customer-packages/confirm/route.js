// POST /api/me/customer-packages/confirm → Stripe Checkout(payment)完了後の確定処理
// success_urlに戻ってきた時に呼ぶ。支払い済みと本人であることを確認してから確定する。
// 確定の中身（回数券の付与・売上の記録・活動ログ）は lib/customer-package-purchase.js。
// Stripe の Webhook（checkout.session.completed）からも同じ処理が走り、どちらが先でも1回だけ確定する。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { finalizePackagePurchase, PackagePurchaseError } from '@/lib/customer-package-purchase';

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

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    // 本人の購入だけ（他人の session_id で他人の回数券を見たり確定させたりしない）
    if (session.metadata?.fineme_user_id !== user.id) return Response.json({ error: '権限がありません' }, { status: 403 });
    const { row, created } = await finalizePackagePurchase(supabase, session);
    return Response.json(row, { status: created ? 201 : 200 });
  } catch (e) {
    if (e instanceof PackagePurchaseError) return Response.json({ error: e.message }, { status: e.status });
    console.error('[customer-packages confirm]', e);
    return Response.json({ error: '確認に失敗しました' }, { status: 500 });
  }
}
