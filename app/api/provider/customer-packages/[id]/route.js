// PATCH /api/provider/customer-packages/[id] → サブスク型パッケージの解約
// でお要望2026-09-14：月額会員への自動チケット付与機能。解約後は次回以降の自動付与を止める。
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
  if (body.subscription_status !== 'cancelled') return Response.json({ error: '不正な操作です' }, { status: 400 });

  const { data, error } = await supabase
    .from('customer_packages')
    .update({ subscription_status: 'cancelled', next_grant_at: null })
    .eq('id', id)
    .eq('provider_id', provider.id)
    .eq('package_type', 'subscription')
    .select()
    .single();
  if (error || !data) return Response.json({ error: '見つかりません' }, { status: 404 });
  return Response.json(data);
}
