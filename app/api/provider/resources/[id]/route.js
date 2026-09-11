// PATCH  /api/provider/resources/[id] → 更新
// DELETE /api/provider/resources/[id] → 削除
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const updates = {};
  if (body.name !== undefined)       updates.name       = String(body.name || '').slice(0, 100);
  if (body.type !== undefined)       updates.type       = body.type ? String(body.type).slice(0, 30) : 'room';
  if (body.active !== undefined)     updates.active     = !!body.active;
  if (body.sort_order !== undefined) updates.sort_order = Number(body.sort_order) || 0;

  const { data, error } = await supabase
    .from('provider_resources')
    .update(updates)
    .eq('id', id)
    .eq('provider_id', provider.id)
    .select()
    .single();

  if (error || !data) return Response.json({ error: '該当リソースが見つかりません' }, { status: 404 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('provider_resources')
    .delete()
    .eq('id', id)
    .eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
