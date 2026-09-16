// PATCH  /api/provider/classes/[id]/sessions/[sessionId] → 締切/再開・定員変更
// DELETE /api/provider/classes/[id]/sessions/[sessionId] → 開催回を削除（予約中のお客様がいる場合は拒否）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const OCCUPYING_STATUSES = ['pending', 'approved', 'counter_proposed', 'visited'];

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function PATCH(request, { params }) {
  const { id, sessionId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = {};
  if ('is_open' in body) update.is_open = !!body.is_open;
  if ('capacity' in body) update.capacity = Number(body.capacity) || 1;
  if ('start_time' in body) update.start_time = body.start_time;
  if ('end_time' in body) update.end_time = body.end_time;

  const { data, error } = await supabase
    .from('provider_slots')
    .update(update)
    .eq('id', sessionId)
    .eq('provider_id', provider.id)
    .eq('class_id', id)
    .select()
    .single();
  if (error || !data) return Response.json({ error: '開催回が見つかりません' }, { status: 404 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const { id, sessionId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: booked } = await supabase.from('reservations').select('id').eq('slot_id', sessionId).in('status', OCCUPYING_STATUSES).limit(1);
  if (booked?.length) return Response.json({ error: '予約中のお客様がいるため削除できません。先に予約側をキャンセルしてください' }, { status: 409 });

  const { error } = await supabase.from('provider_slots').delete().eq('id', sessionId).eq('provider_id', provider.id).eq('class_id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
