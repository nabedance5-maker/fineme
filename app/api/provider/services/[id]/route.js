// PATCH /api/provider/services/[id] - サービス更新
// DELETE /api/provider/services/[id] - サービス削除
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderFromToken(token) {
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data;
}

export async function PATCH(request, { params }) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderFromToken(token);
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });

  const { id } = params;
  const body = await request.json();
  const allowed = ['name','description','price','duration','is_featured','sort_order','image_url','suitable_path_types','transformation_promise','target_axis','before_text','after_text','before_image_url','after_image_url','benefit_list','category'];
  const updates = {};
  for (const k of allowed) { if (body[k] !== undefined) updates[k] = body[k]; }
  if (updates.price) updates.price = Number(updates.price);

  const { data, error } = await supabase
    .from('provider_services')
    .update(updates)
    .eq('id', id).eq('provider_id', provider.id)
    .select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderFromToken(token);
  if (!provider) return Response.json({ error: 'Not found' }, { status: 404 });

  const { id } = params;
  const { error } = await supabase
    .from('provider_services')
    .delete().eq('id', id).eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
