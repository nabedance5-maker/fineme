// GET /api/cron/billing-monthly-summary
// Vercel Cron：毎月1日 0:30 UTC（9:30 JST）。前の月のお店の月額プランの入金・引き落としの失敗・新規・解約をまとめて運営にメールする
// （2026-11-17 渡邉依頼。契約は申込日から1か月ごとのまま、締めは暦の月で見る）。?month=YYYY-MM で月を指定して送り直せる。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { sendBroadcastEmail } from '@/lib/email';
import { buildMonthlySummary, summaryEmailHtml, jstMonth, monthRange } from '@/lib/billing-monthly-summary';

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'h.watanabe@fineme.me';
const ADMIN_URL = 'https://www.fineme.me/admin/payments?tab=monthly';

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripe は未設定です' }, { status: 503 });
  const month = new URL(request.url).searchParams.get('month') || jstMonth(-1);
  if (!monthRange(month)) return Response.json({ error: 'month は YYYY-MM' }, { status: 400 });

  const s = await buildMonthlySummary(new Stripe(process.env.STRIPE_SECRET_KEY), getSupabase(), month);
  const [y, m] = month.split('-').map(Number);
  const t = s.totals;
  await sendBroadcastEmail({
    to: OWNER_EMAIL,
    subject: `【Fineme運営】${y}年${m}月の月額プラン：入金¥${t.paid_amount.toLocaleString('ja-JP')}（${t.paid_count}件）${t.unpaid_count ? `・失敗${t.unpaid_count}件` : ''}`,
    html: summaryEmailHtml(s, ADMIN_URL),
  });
  return Response.json({ month, ...t });
}
