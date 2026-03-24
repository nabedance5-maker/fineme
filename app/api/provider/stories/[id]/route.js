// PATCH /api/provider/stories/[id] → provider_hidden の切り替え（認証済み）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function PATCH(request, { params }) {
  const { id } = params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { provider_hidden } = body;

  // 自分のstoryのみ更新可能
  const { data, error } = await supabase
    .from('stories')
    .update({ provider_hidden: !!provider_hidden })
    .eq('id', id)
    .eq('provider_id', provider.id)
    .select('id, provider_hidden')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(data);
}
