// GET /api/mirror/result?session_id=X
// 支払確認後にフル分析結果を返す
// Stripeのcheckout session statusを直接確認（webhookに依存しない）
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { sendLinePush } from '@/lib/line-push';
import { isOwnerTestEmail } from '@/lib/is-owner-email';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const session_id = searchParams.get('session_id');
  if (!session_id) return Response.json({ error: 'session_id は必須です' }, { status: 400 });

  const { data: mirrorSession, error } = await supabase
    .from('mirror_sessions')
    .select('*')
    .eq('id', session_id)
    .single();

  if (error || !mirrorSession) {
    return Response.json({ error: 'セッションが見つかりません' }, { status: 404 });
  }

  // すでに paid ならそのまま返す
  if (mirrorSession.paid) {
    return Response.json({ paid: true, analysis: mirrorSession.analysis });
  }

  // Stripeで支払状態を確認（checkout session経由）
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && mirrorSession.stripe_checkout_session_id) {
    try {
      const stripe = new Stripe(stripeKey);
      const checkoutSession = await stripe.checkout.sessions.retrieve(
        mirrorSession.stripe_checkout_session_id
      );

      if (checkoutSession.payment_status === 'paid') {
        const purchaserEmail = checkoutSession.customer_details?.email || null;
        const isOwnerTest = isOwnerTestEmail(purchaserEmail);

        // DBを更新してpaidにする
        await supabase
          .from('mirror_sessions')
          .update({
            paid: true,
            stripe_payment_intent_id: String(checkoutSession.payment_intent || ''),
            purchaser_email: purchaserEmail,
            is_owner_test: isOwnerTest,
          })
          .eq('id', session_id);

        // でお本人のテストでなければ、外部の実購入として即時通知（曖昧な後日確認をなくす）
        if (!isOwnerTest && process.env.OWNER_LINE_USER_ID) {
          await sendLinePush(
            process.env.OWNER_LINE_USER_ID,
            `🎉 外部の実購入を検知\nMirror単発 ¥500\nemail: ${purchaserEmail || '不明'}`
          );
        }

        return Response.json({ paid: true, analysis: mirrorSession.analysis });
      }
    } catch (e) {
      console.error('Stripe verify error:', e);
    }
  }

  return Response.json({ paid: false }, { status: 402 });
}
