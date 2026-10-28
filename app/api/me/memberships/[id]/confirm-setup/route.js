// POST /api/me/memberships/[id]/confirm-setup → Stripe Checkout(setup)完了後の確定処理
// success_urlに戻ってきた時に呼ぶ。カードの保存を確認し、仮契約（pending_approval）に
// 進める。ここではまだ課金しない——課金は店舗の承認時（でお要望2026-09-15：
// 「スマホ上での入力が終わると仮契約の状態になる」「店舗側で承認・完了処理を行う」）。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { completeEnrollmentSetup } from '@/lib/membership-enroll';

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

  const { data: m } = await supabase.from('provider_memberships').select('id, user_id').eq('id', id).single();
  if (!m || m.user_id !== user.id) return Response.json({ error: '見つかりません' }, { status: 404 });
  try {
    // 承認待ちにして、お店にメール・LINEで知らせる（webhook と共通。どちらが先でも1回だけ。lib/membership-enroll.js）
    const r = await completeEnrollmentSetup(supabase, stripe, id);
    if (r.error) return Response.json({ error: r.error }, { status: r.status || 409 });
    return Response.json(r.membership);
  } catch (e) {
    console.error('[memberships confirm-setup]', e);
    return Response.json({ error: '確認に失敗しました: ' + e.message }, { status: 500 });
  }
}
