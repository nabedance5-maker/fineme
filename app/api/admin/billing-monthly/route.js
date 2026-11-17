// GET /api/admin/billing-monthly?month=YYYY-MM → お店の月額プランの、その月のお金のまとめ（運営だけ・x-admin-key）
// 中身は lib/billing-monthly-summary.js（正本は Stripe）。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { buildMonthlySummary, jstMonth, monthRange } from '@/lib/billing-monthly-summary';

export async function GET(request) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || request.headers.get('x-admin-key') !== adminKey) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripe は未設定です' }, { status: 503 });
  const month = new URL(request.url).searchParams.get('month') || jstMonth(0);
  if (!monthRange(month)) return Response.json({ error: '月の指定が正しくありません（YYYY-MM）' }, { status: 400 });
  try {
    const summary = await buildMonthlySummary(new Stripe(process.env.STRIPE_SECRET_KEY), getSupabase(), month);
    return Response.json(summary);
  } catch (e) {
    console.error('[admin/billing-monthly]', e?.message);
    return Response.json({ error: '集計できませんでした。時間をおいてもう一度お試しください' }, { status: 500 });
  }
}
