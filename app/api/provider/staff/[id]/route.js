// PATCH  /api/provider/staff/[id] → スタッフ更新
// DELETE /api/provider/staff/[id] → スタッフ削除
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
  if (body.name !== undefined)             updates.name             = String(body.name || '').slice(0, 100);
  if (body.role !== undefined)             updates.role             = body.role ? String(body.role).slice(0, 100) : null;
  if (body.bio !== undefined)              updates.bio              = body.bio  ? String(body.bio).slice(0, 800)  : null;
  if (body.photo_url !== undefined)        updates.photo_url        = body.photo_url || null;
  if (body.experience_years !== undefined) updates.experience_years = body.experience_years ? Number(body.experience_years) : null;
  if (body.credentials !== undefined)      updates.credentials      = body.credentials ? String(body.credentials).slice(0, 400) : null;
  if (body.is_featured !== undefined)      updates.is_featured      = !!body.is_featured;
  if (body.sort_order !== undefined)       updates.sort_order       = Number(body.sort_order) || 0;
  if (body.strong_types !== undefined)     updates.strong_types     = Array.isArray(body.strong_types) ? body.strong_types : [];
  if (body.strong_axes !== undefined)      updates.strong_axes      = Array.isArray(body.strong_axes) ? body.strong_axes : [];

  const { data, error } = await supabase
    .from('provider_staff')
    .update(updates)
    .eq('id', id)
    .eq('provider_id', provider.id)
    .select()
    .single();

  if (error || !data) return Response.json({ error: '該当スタッフが見つかりません' }, { status: 404 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('provider_staff')
    .delete()
    .eq('id', id)
    .eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
