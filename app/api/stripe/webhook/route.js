// POST /api/stripe/webhook
// Stripeイベントを受信してSupabaseを更新する
// billing_status: free → active（payment_succeeded）/ cancelled / past_due
import { getSupabase } from '@/lib/supabase';
import Stripe from 'stripe';
import { getPlanKeyByPriceId, getPlanByPriceId } from '@/lib/stripe-plans';
import { recordMembershipInvoice, recordMembershipSubscription, applyMembershipCardUpdate } from '@/lib/membership-billing';
import { afterMembershipInvoice, syncManagedDiscount } from '@/lib/membership-billing-sync';
import { sendReservationCreatedEmails } from '@/lib/email';
import { recordPosTransaction } from '@/lib/pos-checkout';
import { markInvoicePaid } from '@/lib/invoices';
import { recordPaymentAndRewards, recordRefund } from '@/lib/collaborator-rewards';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const supabaseAdmin = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function POST(request) {
  const stripe = getStripe();
  if (!stripe) return new Response('Stripe is not configured', { status: 503 });

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        // お客様の月会費（会員プラン）は店舗自身の契約と別に扱う（2026-10-19：取り違えると店舗のプランがAに書き換わっていた）
        if (await recordMembershipSubscription(supabaseAdmin, sub, false)) {
          // 休会が明けた（再開日が来て Stripe が自動で再開した）時は、次の請求に割引の明細を付け直す
          if (event.data.previous_attributes && 'pause_collection' in event.data.previous_attributes && !sub.pause_collection) {
            try { await syncManagedDiscount(supabaseAdmin, stripe, sub.metadata.fineme_membership_id); } catch (e) { console.error('[webhook] membership discount sync', e?.message); }
          }
          break;
        }
        const providerId = sub.metadata?.fineme_provider_id;
        if (!providerId) break;

        const priceId = sub.items?.data?.[0]?.price?.id;
        if (!getPlanByPriceId(priceId)) break; // Fineme掲載プラン以外のサブスクで店舗の契約を書き換えない
        const planKey = getPlanKeyByPriceId(priceId);

        await supabaseAdmin.from('providers').upsert({
          id: providerId,
          stripe_subscription_id: sub.id,
          stripe_customer_id: sub.customer,
          billing_status: sub.status,
          plan: planKey,
        }, { onConflict: 'id' });

        console.log(`[webhook] subscription ${sub.status} for provider ${providerId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        if (await recordMembershipSubscription(supabaseAdmin, sub, true)) break;
        const providerId = sub.metadata?.fineme_provider_id;
        if (!providerId) break;
        if (!getPlanByPriceId(sub.items?.data?.[0]?.price?.id)) break;
        await supabaseAdmin.from('providers')
          .update({ billing_status: 'cancelled' })
          .eq('id', providerId);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (await recordMembershipInvoice(supabaseAdmin, invoice, 'succeeded')) {
          // 月会費：払われた請求の点検（割引・請求額がレシートどおりか）と、次の月の割引の明細
          try { await afterMembershipInvoice(supabaseAdmin, stripe, invoice, 'succeeded'); } catch (e) { console.error('[webhook] membership invoice check', e?.message); }
          break;
        }
        const providerId = invoice.subscription_details?.metadata?.fineme_provider_id
          || invoice.metadata?.fineme_provider_id;
        if (!providerId) break;

        // 課金成功 → providers テーブルを active に更新
        await supabaseAdmin.from('providers')
          .update({ billing_status: 'active' })
          .eq('id', providerId);
        await supabaseAdmin.from('providers')
          .update({ billing_started: new Date().toISOString() })
          .eq('id', providerId)
          .is('billing_started', null);

        // 掲載料の受領を記録し、紹介報酬（一般）と協業者報酬（10%オーバーライド等）を計算・記録する
        try {
          await recordPaymentAndRewards(supabaseAdmin, providerId, invoice);
        } catch (e) {
          console.error('[webhook] reward recording error:', e);
        }

        console.log(`[webhook] payment succeeded for provider ${providerId}: ¥${invoice.amount_paid}`);
        break;
      }

      // 返金：該当請求書の受領を返金済みにし、未払いの協業者報酬を無効にする
      case 'charge.refunded': {
        const charge = event.data.object;
        if (charge.invoice) {
          try { await recordRefund(supabaseAdmin, charge.invoice); } catch (e) { console.error('[webhook] refund record error:', e); }
        }
        break;
      }

      // 月会費の請求が取り消された（休会中の請求など）：支払いの記録を取り消し、割引の明細を次の請求に付け直す
      case 'invoice.voided': {
        const invoice = event.data.object;
        if (await recordMembershipInvoice(supabaseAdmin, invoice, 'void')) {
          try { await afterMembershipInvoice(supabaseAdmin, stripe, invoice, 'void'); } catch (e) { console.error('[webhook] membership invoice void', e?.message); }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (await recordMembershipInvoice(supabaseAdmin, invoice, 'failed')) break;
        const providerId = invoice.subscription_details?.metadata?.fineme_provider_id;
        if (!providerId) break;
        await supabaseAdmin.from('providers')
          .update({ billing_status: 'past_due' })
          .eq('id', providerId);
        break;
      }

      // POSのオンライン決済（でお要望2026-09-27：決済機能Phase6②）。POSはFineme未登録の
      // 来店客も対象になるため、ログイン中の本人がsuccess_urlに戻ってくる前提の確定方式が
      // 使えない。Webhook駆動で確定し、支払いが取れて初めてrecordPosTransactionで記録する。
      case 'checkout.session.completed': {
        const session = event.data.object;
        // 月会費のカード更新（店舗が送った更新リンク）：新しいカードを既定にし、未払いの月会費を引き落とし直す
        if (session.mode === 'setup' && session.metadata?.fineme_membership_card_update) {
          try { await applyMembershipCardUpdate(supabaseAdmin, session, stripe); } catch (e) { console.error('[webhook] membership card update error:', e); }
          break;
        }
        const pendingId = session.metadata?.fineme_pos_pending_id;
        const depositReservationId = session.metadata?.fineme_deposit_reservation_id;
        const invoiceId = session.metadata?.fineme_invoice_id;
        if (session.payment_status !== 'paid') break;

        if (invoiceId) {
          // 請求（店舗がお客様に送ったお支払いリンク）の入金確定。二重配信は markInvoicePaid 側で1回に絞る
          await markInvoicePaid(supabaseAdmin, invoiceId, { method: 'online', paymentIntentId: session.payment_intent });
          break;
        }

        if (pendingId) {
          const { data: pending } = await supabaseAdmin.from('provider_pos_pending_checkouts').select('*').eq('id', pendingId).single();
          if (!pending || pending.status !== 'pending') break; // 二重webhook配信への対策

          try {
            const result = await recordPosTransaction(supabaseAdmin, {
              providerId: pending.provider_id,
              items: pending.items,
              staffId: pending.staff_id,
              paymentMethod: 'オンライン決済',
              memo: pending.memo,
              discount: pending.discount || undefined,
              customer: pending.customer || undefined,
              source: 'pos_online',
            });
            await supabaseAdmin.from('provider_pos_pending_checkouts')
              .update({ status: 'paid', transaction_id: result.transaction.id })
              .eq('id', pendingId);
          } catch (e) {
            console.error('[webhook] pos online-checkout record error:', e);
            await supabaseAdmin.from('provider_pos_pending_checkouts').update({ status: 'failed' }).eq('id', pendingId);
          }
        } else if (depositReservationId) {
          // 予約デポジット確定（決済機能Phase6③・でお要望2026-09-27）
          const { data: reservation } = await supabaseAdmin.from('reservations').select('id, deposit_status').eq('id', depositReservationId).single();
          if (!reservation || reservation.deposit_status !== 'pending') break; // 二重webhook配信への対策
          await supabaseAdmin.from('reservations')
            .update({ deposit_status: 'paid', stripe_deposit_payment_intent_id: session.payment_intent })
            .eq('id', depositReservationId);
        }
        break;
      }
    }
  } catch (err) {
    console.error(`[webhook] handler error for ${event.type}:`, err);
  }

  return new Response('ok', { status: 200 });
}
