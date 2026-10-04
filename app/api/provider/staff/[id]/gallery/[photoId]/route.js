// PATCH  /api/provider/staff/[id]/gallery/[photoId] → キャプション更新
// DELETE /api/provider/staff/[id]/gallery/[photoId] → 写真削除
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProvider(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

async function __PATCH(request, { params }) {
  const { id, photoId } = await params;
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const { data, error } = await supabase
    .from('provider_staff_gallery')
    .update({ caption: body.caption ? String(body.caption).slice(0, 80) : null })
    .eq('id', photoId)
    .eq('staff_id', id)
    .eq('provider_id', provider.id)
    .select('id, image_url, caption')
    .single();
  if (error || !data) return Response.json({ error: '該当の写真が見つかりません' }, { status: 404 });
  return Response.json(data);
}

async function __DELETE(request, { params }) {
  const { id, photoId } = await params;
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabase
    .from('provider_staff_gallery')
    .delete()
    .eq('id', photoId)
    .eq('staff_id', id)
    .eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
