// POST /api/provider/pos/transactions/[id] {action: 'refund', reason} → 返品・会計の取り消し（でお要望 2026-10-19：hacomono差分 #12）
// 在庫を戻し、売上にマイナスの行を入れる。カードで払われた会計は、Stripe側でもお客様のカードへ返金する。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { memberAuth } from '@/lib/provider-members';
import { refundPosTransaction } from '@/lib/pos-checkout';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function __POST(request, { params }) {
  const { id } = await params;
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (b.action !== 'refund') return Response.json({ error: '操作の種類が正しくありません' }, { status: 400 });
  try {
    // カードで払われた会計（登録済みのカード・お客様のスマホでのオンライン決済）は、Stripe側もお客様のカードへ返金する（2026-10-28）。
    // お店に送ったお金から戻す（reverse_transfer）。Finemeの手数料は戻らない（返金の手数料の扱いは「一旦は今のまま」2026-10-27）
    const { data: tx } = await supabase.from('provider_pos_transactions').select('status, stripe_payment_intent_id').eq('id', id).eq('provider_id', a.provider.id).maybeSingle();
    if (tx?.stripe_payment_intent_id && tx.status !== 'refunded') {
      if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      try {
        await stripe.refunds.create({ payment_intent: tx.stripe_payment_intent_id, reverse_transfer: true }, { idempotencyKey: `pos-refund-${id}` });
      } catch (e) {
        if (e?.code !== 'charge_already_refunded') return Response.json({ error: `カードへの返金ができませんでした（${e.message}）` }, { status: 400 });
      }
    }
    return Response.json(await refundPosTransaction(supabase, { providerId: a.provider.id, transactionId: id, reason: b.reason, operator: a.user.fineme_member?.name || 'オーナー' }));
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
export const POST = withAudit(__POST);
