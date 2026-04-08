// PATCH  /api/provider/slots/[id] → スロット更新（is_open の切り替え等）
// DELETE /api/provider/slots/[id] → スロット削除
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
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(token);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const updates = {};
  if (body.is_open  !== undefined) updates.is_open   = !!body.is_open;
  if (body.capacity !== undefined) updates.capacity  = Number(body.capacity) || 1;
  if (body.start_time !== undefined) updates.start_time = body.start_time;
  if (body.end_time   !== undefined) updates.end_time   = body.end_time;
  if (body.service_id !== undefined) updates.service_id = body.service_id || null;

  const { data, error } = await supabase
    .from('provider_slots')
    .update(updates)
    .eq('id', id)
    .eq('provider_id', provider.id)
    .select()
    .single();

  if (error || !data) return Response.json({ error: '該当スロットが見つかりません' }, { status: 404 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(token);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('provider_slots')
    .delete()
    .eq('id', id)
    .eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
