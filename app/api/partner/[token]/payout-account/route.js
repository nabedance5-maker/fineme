// GET  /api/partner/[token]/payout-account → 報酬の受け取り口座の状態
// POST /api/partner/[token]/payout-account → 受け取り口座（Stripe）の登録ページへのリンクを作る
// 2026-11-06 渡邉要望：紹介報酬を手作業の振込でなく自動で送る（lib/partner-payout.js）。本人確認は専用URLのトークン（/api/partner/[token] と同じ）
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { partnerOnboardingLink, refreshPartnerAccount, payoutDestination } from '@/lib/partner-payout';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const stripe = () => (process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null);

async function partnerOf(token) {
  const { data } = await supabase.from('sales_partners').select('id, name, email, provider_id, stripe_connect_id, stripe_connect_status').eq('access_token', token).maybeSingle();
  return data;
}

export async function GET(request, props) {
  const { token } = await props.params;
  const partner = await partnerOf(token);
  if (!partner) return Response.json({ error: 'リンクが無効です' }, { status: 404 });
  const s = stripe();
  let own = null;
  if (s && partner.stripe_connect_id) {
    try { own = await refreshPartnerAccount(supabase, s, partner); partner.stripe_connect_status = own?.status || partner.stripe_connect_status; } catch { /* Stripeに繋がらない時は保存済みの状態で返す */ }
  }
  const dest = await payoutDestination(supabase, partner);
  return Response.json({
    account: dest ? dest.via : (partner.stripe_connect_id ? 'pending' : 'none'),
    payouts_enabled: own?.payouts_enabled ?? null,
  });
}

export async function POST(request, props) {
  const { token } = await props.params;
  const partner = await partnerOf(token);
  if (!partner) return Response.json({ error: 'リンクが無効です' }, { status: 404 });
  const s = stripe();
  if (!s) return Response.json({ error: 'ただいま口座の登録ができません' }, { status: 503 });
  try {
    return Response.json({ url: await partnerOnboardingLink(supabase, s, partner, token) });
  } catch (e) {
    console.error('[partner payout-account]', e?.message);
    return Response.json({ error: '口座の登録ページを開けませんでした。時間をおいてもう一度お試しください' }, { status: 500 });
  }
}
