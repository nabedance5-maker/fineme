// GET /api/cron/partner-payouts
// Vercel Cron: 毎月25日 1:00 UTC（10:00 JST）。前月までの営業パートナー・協業者の未払いの報酬を、
// 受け取り口座へ自動で送金する（lib/partner-payout.js・規約 第5条「月末締め・翌月末払い」）。結果は運営にメールで知らせる。
import Stripe from 'stripe';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { runPartnerPayouts } from '@/lib/partner-payout';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const yen = n => `¥${Number(n || 0).toLocaleString()}`;

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripe is not configured' }, { status: 503 });
  const result = await runPartnerPayouts(getSupabase(), new Stripe(process.env.STRIPE_SECRET_KEY));

  const lines = [
    ...result.paid.map(r => `送金済み　${r.name}　${yen(r.amount)}${r.via === 'store' ? '（お店の受け取り口座へ）' : ''}`),
    ...result.held.map(r => `保留　　　${r.name}　${yen(r.amount)}（${r.reason}。本人に専用ページから口座の登録を案内してください）`),
    ...result.failed.map(r => `失敗　　　${r.name}　${yen(r.amount)}（${r.error}）`),
  ];
  if (lines.length && process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
    try {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: 'Fineme <noreply@fineme.me>', to: process.env.ADMIN_EMAIL,
        subject: `【Fineme】紹介報酬の自動送金（${result.month}）${result.failed.length ? `：失敗${result.failed.length}件` : ''}`,
        text: [`${result.month}の紹介報酬の送金結果です（前月までの未払い分）。`, '', ...lines, '', '失敗した分は未払いのまま残っています。Stripeの残高を確かめて、運営の管理画面「営業パートナー」から送り直してください。'].join('\n'),
      });
    } catch (e) { console.error('[cron/partner-payouts] mail', e?.message); }
  }
  return Response.json(result);
}
