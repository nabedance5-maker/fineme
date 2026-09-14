// PATCH /api/provider/lockers/[id]/contracts/[contractId] → 解約（status:'cancelled'）
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
  const { contractId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body.status !== 'cancelled') return Response.json({ error: '不正な操作です' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_locker_contracts')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('provider_id', provider.id)
    .select()
    .single();
  if (error || !data) return Response.json({ error: '見つかりません' }, { status: 404 });
  return Response.json(data);
}
