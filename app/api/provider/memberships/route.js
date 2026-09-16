// GET /api/provider/memberships → 自店舗への入会申込一覧（仮契約・会員・却下）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rows, error } = await supabase
    .from('provider_memberships')
    .select('id, user_id, plan_id, status, last_name, first_name, enrollment_date, prorated_first_amount, locker_id, created_at, approved_at')
    .eq('provider_id', provider.id)
    .in('status', ['pending_approval', 'active', 'rejected', 'cancelled'])
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return Response.json([]);

  const planIds = [...new Set(rows.map(r => r.plan_id).filter(Boolean))];
  const lockerIds = [...new Set(rows.map(r => r.locker_id).filter(Boolean))];
  const [{ data: plans }, { data: lockers }] = await Promise.all([
    planIds.length ? supabase.from('provider_membership_plans').select('id, name, monthly_price').in('id', planIds) : { data: [] },
    lockerIds.length ? supabase.from('provider_lockers').select('id, name').in('id', lockerIds) : { data: [] },
  ]);
  const planMap = {}; (plans || []).forEach(p => { planMap[p.id] = p; });
  const lockerMap = {}; (lockers || []).forEach(l => { lockerMap[l.id] = l; });

  return Response.json(rows.map(r => ({
    ...r,
    plan_name: planMap[r.plan_id]?.name || null,
    plan_price: planMap[r.plan_id]?.monthly_price || null,
    locker_name: lockerMap[r.locker_id]?.name || null,
  })));
}
