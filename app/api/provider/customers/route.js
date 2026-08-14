// GET /api/provider/customers → New Me Logを自店舗に紐づけている顧客の一覧（認証済み）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider?.slug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: logs, error } = await supabase
    .from('user_service_logs')
    .select('id, user_id, axis, name, last_visit, next_visit, frequency_weeks, frequency_months, cost, created_at')
    .eq('provider_slug', provider.slug)
    .eq('active', true)
    .order('next_visit', { ascending: true, nullsFirst: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!logs?.length) return Response.json([]);

  const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];
  const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
  const nameMap = {};
  (profiles || []).forEach(p => { nameMap[p.id] = p.display_name; });

  const result = logs.map(l => ({
    ...l,
    customer_name: nameMap[l.user_id] || '(名前未設定)',
  }));

  return Response.json(result);
}
