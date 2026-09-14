// POST /api/provider/lockers/[id]/contracts → 契約開始（既に契約中なら拒否）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function POST(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: locker } = await supabase.from('provider_lockers').select('*').eq('id', id).eq('provider_id', provider.id).single();
  if (!locker) return Response.json({ error: 'ロッカーが見つかりません' }, { status: 404 });

  const { count } = await supabase.from('provider_locker_contracts').select('id', { count: 'exact', head: true }).eq('locker_id', id).eq('status', 'active');
  if ((count || 0) > 0) return Response.json({ error: 'このロッカーは既に契約中です' }, { status: 409 });

  const body = await request.json().catch(() => ({}));
  const { contractor_name, monthly_fee, note, user_id } = body;
  if (!contractor_name?.trim()) return Response.json({ error: '契約者名は必須です' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_locker_contracts')
    .insert({
      locker_id: id,
      provider_id: provider.id,
      user_id: user_id || null,
      contractor_name: contractor_name.trim(),
      monthly_fee: Number.isFinite(Number(monthly_fee)) && monthly_fee !== '' ? Number(monthly_fee) : (locker.monthly_fee || null),
      note: note || null,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
