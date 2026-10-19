// GET /api/provider/memberships/[id] → 申込詳細（本人確認書類は署名付きURLを都度発行）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import Stripe from 'stripe';
import { planLockedResponse } from '@/lib/plan-features';
import { periodEndOf } from '@/lib/membership-changes';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

export async function GET(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'membership_enrollment'); if (locked) return locked; }

  const { data: m } = await supabase.from('provider_memberships').select('*').eq('id', id).eq('provider_id', provider.id).single();
  if (!m) return Response.json({ error: '見つかりません' }, { status: 404 });

  const [{ data: profile }, { data: plan }, { data: locker }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', m.user_id).single(),
    m.plan_id ? supabase.from('provider_membership_plans').select('name, monthly_price').eq('id', m.plan_id).single() : Promise.resolve({ data: null }),
    m.locker_id ? supabase.from('provider_lockers').select('name').eq('id', m.locker_id).single() : Promise.resolve({ data: null }),
  ]);

  // 休会・プラン変更・退会の履歴と申請、変更先に選べるプラン、次回の引き落とし日（でお要望 2026-10-19）
  const [{ data: changes }, { data: plans }] = await Promise.all([
    supabase.from('provider_membership_changes').select('*').eq('membership_id', m.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('provider_membership_plans').select('id, name, monthly_price, active').eq('provider_id', provider.id).order('sort_order'),
  ]);
  const planName = Object.fromEntries((plans || []).map(p => [p.id, p.name]));
  let next_charge_date = null;
  if (m.status === 'active' && m.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const sub = await new Stripe(process.env.STRIPE_SECRET_KEY).subscriptions.retrieve(m.stripe_subscription_id);
      const end = periodEndOf(sub);
      if (end && !sub.pause_collection) next_charge_date = new Date(end * 1000 + 9 * 3600000).toISOString().slice(0, 10);
    } catch { /* Stripeに繋がらない時は省く */ }
  }

  let id_document_url = null;
  if (m.id_document_path) {
    const { data: signed } = await supabase.storage.from('id-documents').createSignedUrl(m.id_document_path, 300);
    id_document_url = signed?.signedUrl || null;
  }

  return Response.json({
    ...m,
    customer_name: profile?.display_name || null,
    id_document_url,
    plan_name: plan?.name || null,
    plan_price: plan?.monthly_price ?? null,
    locker_name: locker?.name || null,
    next_charge_date,
    plans: (plans || []).filter(p => p.active || p.id === m.plan_id),
    changes: (changes || []).map(c => ({ ...c, from_plan_name: planName[c.from_plan_id] || null, to_plan_name: planName[c.to_plan_id] || null })),
  });
}
