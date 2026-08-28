// POST   /api/provider/customer-packages/[id]/usages → 1回消化を記録
// DELETE /api/provider/customer-packages/[id]/usages → 直近の消化を取り消す（店舗の誤操作対策）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug').eq('email', user.email).single();
  return data || null;
}

async function getOwnedCustomerPackage(providerId, id) {
  const { data } = await supabase
    .from('customer_packages')
    .select('id, total_sessions')
    .eq('id', id)
    .eq('provider_id', providerId)
    .single();
  return data || null;
}

export async function POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cp = await getOwnedCustomerPackage(provider.id, params.id);
  if (!cp) return Response.json({ error: 'パッケージが見つかりません' }, { status: 404 });

  const { data: activeUsages } = await supabase
    .from('package_usages')
    .select('id')
    .eq('customer_package_id', cp.id)
    .is('undone_at', null);
  if ((activeUsages?.length || 0) >= cp.total_sessions) {
    return Response.json({ error: '残り回数がありません' }, { status: 400 });
  }

  const { reservation_id } = await request.json().catch(() => ({}));

  const { data, error } = await supabase
    .from('package_usages')
    .insert({ customer_package_id: cp.id, reservation_id: reservation_id || null })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cp = await getOwnedCustomerPackage(provider.id, params.id);
  if (!cp) return Response.json({ error: 'パッケージが見つかりません' }, { status: 404 });

  const { data: last } = await supabase
    .from('package_usages')
    .select('id')
    .eq('customer_package_id', cp.id)
    .is('undone_at', null)
    .order('used_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!last) return Response.json({ error: '取り消せる消化記録がありません' }, { status: 400 });

  const { error } = await supabase
    .from('package_usages')
    .update({ undone_at: new Date().toISOString() })
    .eq('id', last.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
