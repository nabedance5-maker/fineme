// GET /api/me/cases → 自分の施術事例（承認待ち・承認済み含む）一覧
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: cases, error } = await supabase
    .from('provider_cases')
    .select('id, provider_id, axis, before_score, after_score, image_url, approved_by_user, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!cases?.length) return Response.json([]);

  const providerIds = [...new Set(cases.map(c => c.provider_id))];
  const { data: providers } = await supabase.from('providers').select('id, name').in('id', providerIds);
  const nameMap = Object.fromEntries((providers || []).map(p => [p.id, p.name]));

  return Response.json(cases.map(c => ({ ...c, provider_name: nameMap[c.provider_id] || '' })));
}
