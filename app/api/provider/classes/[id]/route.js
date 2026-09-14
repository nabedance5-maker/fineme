// PATCH  /api/provider/classes/[id] → クラス更新
// DELETE /api/provider/classes/[id] → クラス削除
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
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = {};
  if ('name' in body) update.name = body.name;
  if ('description' in body) update.description = body.description || null;
  if ('capacity' in body) update.capacity = Number.isFinite(Number(body.capacity)) && body.capacity !== '' ? Number(body.capacity) : null;
  if ('level_labels' in body) update.level_labels = Array.isArray(body.level_labels) ? body.level_labels : [];
  if ('active' in body) update.active = !!body.active;

  const { data, error } = await supabase.from('provider_classes').update(update).eq('id', id).eq('provider_id', provider.id).select().single();
  if (error || !data) return Response.json({ error: 'クラスが見つかりません' }, { status: 404 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('provider_classes').delete().eq('id', id).eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
