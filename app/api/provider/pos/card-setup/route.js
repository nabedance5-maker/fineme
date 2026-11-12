// POST /api/provider/pos/card-setup { user_id | manual_id } → お店のレジで使うカードを、お客様に自分のスマホで登録してもらうページを作る
// （2026-11-12 渡邉要望：月額プランの入会以外でカード情報をもらう仕組みが無い。会員証を読み取ったら、そのカードでそのまま払えるように）。
// Stripe Checkout の setup モード：この時点では請求しない。登録が済むと webhook が provider_customer_cards に記録し、
// 次からはレジの「登録済みのカードで払う」で払える（お店が会員証を読み取った時・お客様を選んだ時だけ使う）。
// 非会員のお客様は、カードを持てるようアカウントを用意して紐づけ、その user_id を返す。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { memberAuth } from '@/lib/provider-members';
import { withAudit } from '@/lib/activity-log';
import { isStoreCustomer, ensureManualLinked } from '@/lib/customer-accounts';
import { stripeCustomerFor } from '@/lib/pos-member-card';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function __POST(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'ただいまカードの登録はできません' }, { status: 503 });
  const { data: provider } = await supabase.from('providers').select('id, name, stripe_connect_id, stripe_connect_status').eq('id', a.provider.id).single();
  if (!provider?.stripe_connect_id || provider.stripe_connect_status !== 'active') return Response.json({ error: 'カードでのお支払いの受け付け（決済の設定）が済んでいません' }, { status: 409 });

  const b = await request.json().catch(() => ({}));
  let userId = null;
  if (b.user_id && UUID.test(b.user_id)) {
    if (!(await isStoreCustomer(provider.id, b.user_id))) return Response.json({ error: 'このお店のお客様ではありません' }, { status: 404 });
    userId = b.user_id;
  } else if (b.manual_id && UUID.test(b.manual_id)) {
    const { data: mc } = await supabase.from('provider_manual_customers').select('id').eq('id', b.manual_id).eq('provider_id', provider.id).maybeSingle();
    if (!mc) return Response.json({ error: 'お客様が見つかりません' }, { status: 404 });
    const r = await ensureManualLinked(provider.id, mc.id).catch(e => ({ error: e.message }));
    if (!r?.userId) return Response.json({ error: 'お客様の準備ができませんでした' }, { status: 500 });
    userId = r.userId;
  } else return Response.json({ error: 'お客様を選んでください' }, { status: 400 });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const { data: { user } = {} } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: {} }));
    const email = user?.email && !/@line\.fineme\.me$|\.invalid$/.test(user.email) ? user.email : undefined;
    const customerId = await stripeCustomerFor(supabase, stripe, provider.id, userId, { email, name: String(b.name || '').slice(0, 60) || undefined });
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      currency: 'jpy',
      customer: customerId,
      // 後でお店のレジから請求するための保存（お客様がいない時の請求）
      setup_intent_data: { metadata: { fineme_card_setup: '1', fineme_provider_id: provider.id, fineme_user_id: userId } },
      metadata: { fineme_card_setup: '1', fineme_provider_id: provider.id, fineme_user_id: userId },
      custom_text: { submit: { message: `このカードは${provider.name}でのお会計に使えるよう保存されます。お店が会員証を読み取った時など、お店のレジでだけ使います。登録だけでは請求されません。Finemeのマイページからいつでも外せます。` } },
      success_url: `${BASE_URL}/card-registered?status=success&kind=store`,
      cancel_url: `${BASE_URL}/card-registered?status=cancel&kind=store`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // レジで出したQRを何時間も後に使わせない
    });
    return Response.json({ url: session.url, user_id: userId });
  } catch (e) {
    console.error('[pos card-setup]', e?.message);
    return Response.json({ error: 'カード登録の案内を作れませんでした。時間をおいてもう一度お試しください' }, { status: 500 });
  }
}
export const POST = withAudit(__POST);
