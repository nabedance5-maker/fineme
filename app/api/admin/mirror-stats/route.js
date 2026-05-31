// GET /api/admin/mirror-stats
// Mirrorファネルの統計（利用数・無料→課金転換・紹介経由・フィードバック）
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function checkAdminKey(request) {
  return request.headers.get('x-admin-key') === process.env.ADMIN_API_KEY;
}

// 共有集計ロジック（cronからも再利用）
export async function computeMirrorStats() {
  const supabase = getSupabase();
  const now = Date.now();
  const d7 = new Date(now - 7 * 86400000).toISOString();
  const d30 = new Date(now - 30 * 86400000).toISOString();

  const [sessionsRes, subRes, refRes, fbRes] = await Promise.all([
    supabase.from('mirror_sessions').select('created_at, paid, stripe_payment_intent_id'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabase.from('referrals').select('created_at'),
    supabase.from('feedback').select('rating_accuracy, rating_revisit, comment, created_at').eq('page', 'mirror'),
  ]);

  const sessions = sessionsRes.data || [];
  const inWindow = (rows, since) => rows.filter(r => r.created_at >= since);
  const isPurchase = (s) => !!s.stripe_payment_intent_id;             // ¥500実購入
  const isFreeUnlock = (s) => s.paid && !s.stripe_payment_intent_id;  // サブスク/紹介/オーナー無料

  const agg = (rows) => {
    const total = rows.length;
    const purchases = rows.filter(isPurchase).length;
    const freeUnlocks = rows.filter(isFreeUnlock).length;
    const previewOnly = rows.filter(s => !s.paid).length;
    return {
      total,
      purchases,
      freeUnlocks,
      previewOnly,
      revenue: purchases * 500,
      conversionRate: total > 0 ? Math.round((purchases / total) * 1000) / 10 : 0, // %
    };
  };

  const referrals = refRes.data || [];
  const fb = fbRes.data || [];
  const avg = (arr) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0;
  const activeSubs = subRes.count ?? 0;

  return {
    all: agg(sessions),
    last30d: agg(inWindow(sessions, d30)),
    last7d: agg(inWindow(sessions, d7)),
    subscription: { active: activeSubs, mrr: activeSubs * 780 },
    referral: {
      total: referrals.length,
      last7d: inWindow(referrals, d7).length,
      last30d: inWindow(referrals, d30).length,
    },
    feedback: {
      count: fb.length,
      avgAccuracy: avg(fb.filter(f => f.rating_accuracy).map(f => f.rating_accuracy)),
      avgRevisit: avg(fb.filter(f => f.rating_revisit).map(f => f.rating_revisit)),
      recentComments: fb.filter(f => f.comment).sort((a, b) => (b.created_at > a.created_at ? 1 : -1)).slice(0, 10).map(f => ({ comment: f.comment, created_at: f.created_at })),
    },
    generatedAt: new Date().toISOString(),
  };
}

export async function GET(request) {
  if (!checkAdminKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const stats = await computeMirrorStats();
    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
