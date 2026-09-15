// PATCH /api/provider/events/[id] → イベント編集（詳細・画像等）
// DELETE /api/provider/events/[id] → イベント削除
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
  if ('title' in body) update.title = body.title?.trim();
  if ('event_date' in body) update.event_date = body.event_date;
  if ('start_time' in body) update.start_time = body.start_time || null;
  if ('memo' in body) update.memo = body.memo?.trim() || null;
  if ('image_url' in body) update.image_url = body.image_url || null;
  if (!Object.keys(update).length) return Response.json({ error: '更新項目がありません' }, { status: 400 });

  const { data, error } = await supabase.from('provider_events').update(update).eq('id', id).eq('provider_id', provider.id).select().single();
  if (error || !data) return Response.json({ error: '見つかりません' }, { status: 404 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('provider_events').delete().eq('id', id).eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
