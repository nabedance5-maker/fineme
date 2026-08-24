// GET /api/provider/area-demand → 自店舗の都道府県のエリア需要（認証済み）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { computeAreaDemand } from '@/lib/area-demand';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: provider } = await supabase.from('providers').select('prefecture').eq('email', user.email).single();
  if (!provider?.prefecture) return Response.json({ areas: [], note: '店舗の都道府県が未設定です' });

  const result = await computeAreaDemand({ prefecture: provider.prefecture });
  return Response.json(result);
}
