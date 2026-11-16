// Stripe の通知（イベント）1件を処理する（2026-11-16 app/api/stripe/webhook/route.js から切り出し）。
// 呼び出し元：
//   - app/api/stripe/webhook/route.js（Stripe からの通知。署名を確かめてから）
//   - app/api/cron/stripe-reconcile/route.js（取りこぼしの拾い直し。Stripe の API から取り直したイベント）
// 同じイベントを2回処理しないよう、呼び出し側が stripe_webhook_events に先に記録してから呼ぶ（claimStripeEvent）。
// 各処理は2回届いても1回分にしかならない作り（状態を条件に更新・一意キー）を保つこと。
import { completeEnrollmentSetup } from '@/lib/membership-enroll';
import { getPlanKeyByPriceId, getPlanByPriceId } from '@/lib/stripe-plans';
import { syncContractVisibility } from '@/lib/provider-contract';
import { recordMembershipInvoice, recordMembershipSubscription, applyMembershipCardUpdate } from '@/lib/membership-billing';
import { afterMembershipInvoice, syncManagedDiscount } from '@/lib/membership-billing-sync';
import { recordPosTransaction } from '@/lib/pos-checkout';
import { saveCustomerCard, saveSetupCard } from '@/lib/pos-member-card';
import { recordLockerCheckout, recordLockerInvoice } from '@/lib/locker-pay';
import { markInvoicePaid } from '@/lib/invoices';
import { finalizePackagePurchase } from '@/lib/customer-package-purchase';
import { recordPaymentAndRewards, recordRefund } from '@/lib/collaborator-rewards';

// 新しい Stripe API（2025-03 以降）では、請求書のサブスクの情報は invoice.parent.subscription_details に入る
const invoiceSubMeta = invoice => invoice?.parent?.subscription_details?.metadata || invoice?.subscription_details?.metadata || invoice?.metadata || {};

// 返金された支払いの請求書ID（新しい API では charge.invoice が無いので、支払いから請求書をたどる）
async function invoiceIdOfCharge(stripe, charge) {
  if (typeof charge.invoice === 'string') return charge.invoice;
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return null;
  try {
    const list = await stripe.invoicePayments.list({ payment: { type: 'payment_intent', payment_intent: pi }, limit: 1 });
    const inv = list.data?.[0]?.invoice;
    return typeof inv === 'string' ? inv : inv?.id || null;
  } catch (e) { console.error('[stripe event] invoice lookup', e?.message); return null; }
}

// Fineme の月額プラン（店舗の掲載料）の請求書か。プラン以外の請求書で店舗の契約を「支払い済み」にしない
function isPlanInvoice(invoice) {
  return (invoice?.lines?.data || []).some(l => {
    const price = l.pricing?.price_details?.price || l.price?.id || l.plan?.id;
    return !!getPlanByPriceId(typeof price === 'string' ? price : price?.id);
  });
}

export const HANDLED_EVENT_TYPES = [
  'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted',
  'invoice.payment_succeeded', 'invoice.payment_failed', 'invoice.voided',
  'charge.refunded', 'checkout.session.completed',
];

// 同じイベントを1回だけ処理するための記録。true＝このイベントを処理してよい（まだ誰も処理していない）
export async function claimStripeEvent(db, event, source) {
  const { error } = await db.from('stripe_webhook_events').insert({ id: event.id, type: event.type, event_created_at: new Date(event.created * 1000).toISOString(), source });
  if (!error) return true;
  if (error.code === '23505') return false; // 処理済み・処理中
  throw new Error(`stripe_webhook_events: ${error.message}`);
}
// 処理に失敗した時は記録を消し、次の通知・拾い直しで処理し直せるようにする
export async function releaseStripeEvent(db, eventId) {
  await db.from('stripe_webhook_events').delete().eq('id', eventId);
}

export async function handleStripeEvent(supabaseAdmin, stripe, event) {
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
        await syncContractVisibility(supabaseAdmin, providerId, sub.status);

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
        await syncContractVisibility(supabaseAdmin, providerId, 'cancelled');
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (await recordMembershipInvoice(supabaseAdmin, invoice, 'succeeded')) {
          // 月会費：払われた請求の点検（割引・請求額がレシートどおりか）と、次の月の割引の明細
          try { await afterMembershipInvoice(supabaseAdmin, stripe, invoice, 'succeeded'); } catch (e) { console.error('[webhook] membership invoice check', e?.message); }
          break;
        }
        // ロッカー代だけの月額（支払いリンクから始まったもの）：売上に記録する（2026-10-29）
        if (await recordLockerInvoice(supabaseAdmin, invoice)) break;
        const providerId = invoiceSubMeta(invoice).fineme_provider_id;
        if (!providerId || !isPlanInvoice(invoice)) break;

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
        const refundedInvoiceId = await invoiceIdOfCharge(stripe, charge);
        if (refundedInvoiceId) {
          try { await recordRefund(supabaseAdmin, refundedInvoiceId); } catch (e) { console.error('[webhook] refund record error:', e); }
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
        const providerId = invoiceSubMeta(invoice).fineme_provider_id;
        if (!providerId || !isPlanInvoice(invoice)) break;
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
        // お店のレジで使うカードの登録（買い物なし）が終わった：このお店のお客様のカードとして記録する（2026-11-12）
        if (session.mode === 'setup' && session.metadata?.fineme_card_setup === '1') {
          try { await saveSetupCard(supabaseAdmin, stripe, session); } catch (e) { console.error('[webhook] store card setup error:', e); }
          break;
        }
        // オンライン入会のカード登録が終わった（お客様が入会ページに戻らなくても、承認待ちにしてお店に知らせる。2026-10-28）
        if (session.mode === 'setup' && session.metadata?.fineme_membership_enroll) {
          try { await completeEnrollmentSetup(supabaseAdmin, stripe, session.metadata.fineme_membership_enroll, session); } catch (e) { console.error('[webhook] membership enroll error:', e); }
          break;
        }
        // ロッカー代の支払いリンクで、お客様がカードを登録した：契約に月額を記録する（2026-10-29）
        if (session.mode === 'subscription' && session.metadata?.fineme_locker_contract_id) {
          try { await recordLockerCheckout(supabaseAdmin, stripe, session); } catch (e) { console.error('[webhook] locker checkout error:', e); }
          break;
        }
        const pendingId = session.metadata?.fineme_pos_pending_id;
        const depositReservationId = session.metadata?.fineme_deposit_reservation_id;
        const invoiceId = session.metadata?.fineme_invoice_id;
        if (session.payment_status !== 'paid') break;

        // 回数券・チケットのオンライン購入：お客様が支払い完了の画面に戻らなくても確定し、売上に記録する（2026-11-16）
        if (session.mode === 'payment' && session.metadata?.fineme_package_id) {
          try { await finalizePackagePurchase(supabaseAdmin, session); } catch (e) { console.error('[webhook] package purchase error:', e?.message); }
          break;
        }

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
              receiptEmail: typeof pending.receipt_email === 'string' ? pending.receipt_email : undefined, // null＝画面で指定なし（お客様の登録のアドレス）
              saveReceiptEmail: !!pending.save_receipt_email,
              source: 'pos_online',
              stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
            });
            await supabaseAdmin.from('provider_pos_pending_checkouts')
              .update({ status: 'paid', transaction_id: result.transaction.id })
              .eq('id', pendingId);
            // お客様が「次回からこのカードで払えるようにする」を選んだ：このお店のレジで会員証から使えるように記録する（2026-10-29）
            if (session.metadata?.fineme_save_card === '1' && pending.customer?.user_id && session.customer) {
              try { await saveCustomerCard(supabaseAdmin, stripe, pending.provider_id, pending.customer.user_id, session); } catch (e) { console.error('[webhook] pos save card error:', e?.message); }
            }
          } catch (e) {
            console.error('[webhook] pos online-checkout record error:', e);
            // 会計を記録できなかった（在庫切れ・商品が消えた等）：お客様のカードへ返金する（お店の登録カードでの会計と同じ扱い。
            // 2026-11-16：以前は「失敗」にするだけで、代金は取ったまま会計が残らなかった）
            const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
            if (piId) {
              try { await stripe.refunds.create({ payment_intent: piId, reverse_transfer: true, refund_application_fee: true }, { idempotencyKey: `pos-online-undo-${piId}` }); }
              catch (re) { console.error('[webhook] pos online-checkout refund error:', re?.message); }
            }
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
}
