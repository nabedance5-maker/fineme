// GET /api/cron/stripe-reconcile
// Stripe の通知（Webhook）の取りこぼしを拾い直す（2026-11-16）。
// 2026-11-16 の点検で、本番の Stripe に /api/stripe/webhook の送り先が登録されておらず、POSのQR決済・お支払いリンク・
// デポジット・ロッカー代・月会費の記録・店舗の月額プランの有効化・紹介報酬が、通知では一度も確定していなかったことが分かった。
// 送り先が消える・Vercel が落ちる・処理が失敗する、のどれが起きても、お金の記録が抜けたままにならないよう、
// 直近3日のイベントを Stripe の API から取り直し、まだ処理していないもの（stripe_webhook_events に無いもの）を古い順に処理する。
// 処理の中身は通知と同じ lib/stripe-event-handler.js。
// Schedule: "40 * * * *"（1時間ごと）
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { handleStripeEvent, claimStripeEvent, releaseStripeEvent, HANDLED_EVENT_TYPES } from '@/lib/stripe-event-handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const WINDOW_SEC = 3 * 24 * 3600;
const MAX_EVENTS = 500;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripe is not configured' }, { status: 503 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const db = getSupabase();
  const started = Date.now();

  // 直近3日のイベント（Stripe は新しい順に返すので、集めてから古い順に並べ直す）
  const events = [];
  for await (const e of stripe.events.list({ types: HANDLED_EVENT_TYPES, created: { gte: Math.floor(Date.now() / 1000) - WINDOW_SEC }, limit: 100 })) {
    events.push(e);
    if (events.length >= MAX_EVENTS) break;
  }
  events.sort((a, b) => a.created - b.created);

  const ids = events.map(e => e.id);
  const done = new Set();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from('stripe_webhook_events').select('id').in('id', ids.slice(i, i + 200));
    if (error) return Response.json({ error: error.message }, { status: 500 });
    (data || []).forEach(r => done.add(r.id));
  }

  const processed = [];
  const failed = [];
  for (const event of events) {
    if (done.has(event.id)) continue;
    if (Date.now() - started > 240_000) break; // 残りは次の回に
    let claimed = false;
    try {
      claimed = await claimStripeEvent(db, event, 'reconcile');
      if (!claimed) continue;
      await handleStripeEvent(db, stripe, event);
      processed.push({ id: event.id, type: event.type });
    } catch (e) {
      console.error(`[cron/stripe-reconcile] ${event.type} ${event.id}`, e);
      if (claimed) { try { await releaseStripeEvent(db, event.id); } catch {} }
      failed.push({ id: event.id, type: event.type, error: String(e?.message || e).slice(0, 200) });
    }
  }
  if (processed.length) console.warn(`[cron/stripe-reconcile] 通知で処理されていなかったイベントを ${processed.length} 件処理しました`, processed);
  return Response.json({ checked: events.length, processed: processed.length, failed: failed.length ? failed : undefined });
}
