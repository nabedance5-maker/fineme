// GET  /api/admin/partner-payouts → パートナーごとの未払いの報酬・受け取り口座・直近の送金
// POST /api/admin/partner-payouts → 前月までの未払いの報酬を今すぐ送金する（毎月25日の自動送金が失敗した時のやり直し用）
// 2026-11-06 渡邉要望：紹介報酬の振込の手作業をなくす（lib/partner-payout.js）
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { runPartnerPayouts, payoutDestination } from '@/lib/partner-payout';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const ADMIN_KEY = process.env.ADMIN_API_KEY || '';
const checkAdmin = request => { const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key'); return key && key === ADMIN_KEY; };

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const [{ data: partners }, { data: std }, { data: col }, { data: pays }] = await Promise.all([
    supabase.from('sales_partners').select('id, provider_id, stripe_connect_id, stripe_connect_status'),
    supabase.from('referral_rewards').select('referrer_id, amount').eq('status', 'pending'),
    supabase.from('collaborator_rewards').select('partner_id, amount').eq('status', 'pending'),
    supabase.from('partner_payouts').select('partner_id, payout_month, amount, status, error, created_at').order('created_at', { ascending: false }).limit(500),
  ]);
  const pending = {};
  (std || []).forEach(r => { pending[r.referrer_id] = (pending[r.referrer_id] || 0) + r.amount; });
  (col || []).forEach(r => { pending[r.partner_id] = (pending[r.partner_id] || 0) + r.amount; });
  const out = {};
  for (const p of partners || []) {
    const dest = await payoutDestination(supabase, p);
    out[p.id] = { pending: pending[p.id] || 0, account: dest ? dest.via : (p.stripe_connect_id ? 'pending' : 'none'), last: (pays || []).find(x => x.partner_id === p.id) || null };
  }
  return Response.json(out);
}

export async function POST(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });
  return Response.json(await runPartnerPayouts(supabase, new Stripe(process.env.STRIPE_SECRET_KEY)));
}
