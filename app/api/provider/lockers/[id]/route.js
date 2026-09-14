// PATCH  /api/provider/lockers/[id] → ロッカー更新
// DELETE /api/provider/lockers/[id] → ロッカー削除（契約中でなければ）
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
  if ('monthly_fee' in body) update.monthly_fee = body.monthly_fee || null;
  if ('active' in body) update.active = !!body.active;

  const { data, error } = await supabase.from('provider_lockers').update(update).eq('id', id).eq('provider_id', provider.id).select().single();
  if (error || !data) return Response.json({ error: '見つかりません' }, { status: 404 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { count } = await supabase.from('provider_locker_contracts').select('id', { count: 'exact', head: true }).eq('locker_id', id).eq('status', 'active');
  if ((count || 0) > 0) return Response.json({ error: '契約中のロッカーは削除できません。先に解約してください' }, { status: 409 });

  const { error } = await supabase.from('provider_lockers').delete().eq('id', id).eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
