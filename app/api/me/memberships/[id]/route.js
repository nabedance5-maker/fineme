// GET /api/me/memberships/[id] → 自分の入会申込の詳細（同意した規約全文を含む）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { nextBillingDate, cancelPlan, describeCycle, jstToday } from '@/lib/membership-cycle';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: m } = await supabase.from('provider_memberships').select('*').eq('id', id).single();
  if (!m || m.user_id !== user.id) return Response.json({ error: '見つかりません' }, { status: 404 });

  const [{ data: provider }, { data: plan }, { data: locker }] = await Promise.all([
    supabase.from('providers').select('name, slug').eq('id', m.provider_id).single(),
    m.plan_id ? supabase.from('provider_membership_plans').select('name, monthly_price').eq('id', m.plan_id).single() : Promise.resolve({ data: null }),
    m.locker_id ? supabase.from('provider_lockers').select('name, monthly_fee').eq('id', m.locker_id).single() : Promise.resolve({ data: null }),
  ]);

  // 休会・プラン変更・退会の申請に使う情報（でお要望 2026-10-19）
  const [{ data: changes }, { data: plans }, { data: settings }] = await Promise.all([
    supabase.from('provider_membership_changes').select('id, kind, status, to_plan_id, timing, effective_date, pause_until, reason, store_note, requested_by, created_at, decided_at').eq('membership_id', m.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('provider_membership_plans').select('id, name, monthly_price').eq('provider_id', m.provider_id).eq('active', true).order('sort_order'),
    supabase.from('provider_membership_settings').select('*').eq('provider_id', m.provider_id).maybeSingle(),
  ]);
  const planName = Object.fromEntries((plans || []).map(p => [p.id, p.name]));

  // 次回の請求日と、今日退会を申し込んだらいつまで・最後の請求はいつか（でお指摘 2026-10-27：締め日を必ず見せる）
  const today = jstToday();
  let billing = null;
  if (m.status === 'active' && m.billing_first_full_date) {
    const beforeStart = m.billing_start_date && today < m.billing_start_date;
    const next = beforeStart ? m.billing_first_full_date : nextBillingDate({ firstFullDate: m.billing_first_full_date, anchorDay: m.billing_anchor_day }, today);
    billing = {
      rule: describeCycle(settings),
      start_date: m.billing_start_date,
      next_billing_date: next,
      cancel_if_today: beforeStart ? { before_start: true } : cancelPlan(settings, { requestDate: today, nextBilling: next, anchorDay: m.billing_anchor_day }),
    };
  }

  return Response.json({
    ...m,
    changes: (changes || []).map(c => ({ ...c, to_plan_name: planName[c.to_plan_id] || null })),
    plans: plans || [],
    allow_online_requests: settings?.allow_online_requests ?? true,
    billing,
    provider_name: provider?.name || null,
    provider_slug: provider?.slug || null,
    plan_name: plan?.name || null,
    plan_price: plan?.monthly_price ?? null,
    locker_name: locker?.name || null,
    locker_fee: locker?.monthly_fee ?? null,
  });
}
