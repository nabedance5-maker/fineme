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
import { createCardSetupSession } from '@/lib/card-setup-link';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
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
    const session = await createCardSetupSession(supabase, stripe, provider, userId, { name: String(b.name || '').slice(0, 60) });
    return Response.json({ url: session.url, user_id: userId });
  } catch (e) {
    console.error('[pos card-setup]', e?.message);
    return Response.json({ error: 'カード登録の案内を作れませんでした。時間をおいてもう一度お試しください' }, { status: 500 });
  }
}
export const POST = withAudit(__POST);
