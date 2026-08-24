// PATCH  /api/provider/experience-menus/[id] → メニュー更新（認証済み・自店舗分のみ）
// DELETE /api/provider/experience-menus/[id] → メニュー削除（認証済み・自店舗分のみ）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

const ALLOWED = ['name', 'price', 'duration_min', 'axes', 'description', 'images', 'is_active', 'sort_order'];

export async function PATCH(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const updates = { updated_at: new Date().toISOString() };
  for (const key of ALLOWED) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from('provider_experience_menus')
    .update(updates)
    .eq('id', params.id)
    .eq('provider_id', provider.id) // 自店舗分のみ更新可能（他店舗のメニューを弄れないように）
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('provider_experience_menus')
    .delete()
    .eq('id', params.id)
    .eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
