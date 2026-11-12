// POST /api/provider/memberships/[id]/approve → 入会申込を承認し、実際の課金を開始する
// 店舗が申込内容（個人情報・本人確認書類・緊急連絡先）を確認した上で押す、入会手続き
// フローの最終ステップ（でお要望2026-09-15：「店舗側で承認・完了処理を行う」）。
// 処理の中身（請求の組み立て・Stripe・顧客情報への取り込み）は lib/membership-approve.js（自動承認と共通。2026-11-12）。
export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { approveMembership } from '@/lib/membership-approve';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, stripe_connect_id, stripe_connect_status, plan').eq('email', user.email).single();
  return data || null;
}

async function __POST(request, { params }) {
  const { id } = await params;
  const stripe = getStripe();
  if (!stripe) return Response.json({ error: 'Stripeが未設定です' }, { status: 503 });

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const r = await approveMembership(supabase, stripe, provider, id);
  return Response.json(r.body, { status: r.status });
}

export const POST = withAudit(__POST);
