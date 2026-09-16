// GET /api/me/memberships/[id] → 自分の入会申込の詳細（同意した規約全文を含む）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

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

  return Response.json({
    ...m,
    provider_name: provider?.name || null,
    provider_slug: provider?.slug || null,
    plan_name: plan?.name || null,
    plan_price: plan?.monthly_price ?? null,
    locker_name: locker?.name || null,
    locker_fee: locker?.monthly_fee ?? null,
  });
}
