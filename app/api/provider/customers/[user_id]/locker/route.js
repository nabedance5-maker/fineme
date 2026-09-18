// GET /api/provider/customers/[user_id]/locker → このお客様が契約中のロッカー（あれば1件）
// でお質問2026-09-18：「ロッカーを契約したら顧客情報に紐づいて表示されるようになってる？」
// を受けて追加。顧客詳細ポップアップに契約中のロッカーを表示するために使う。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request, { params }) {
  const { user_id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: contract } = await supabase
    .from('provider_locker_contracts')
    .select('id, locker_id, monthly_fee, started_at')
    .eq('provider_id', provider.id)
    .eq('user_id', user_id)
    .eq('status', 'active')
    .maybeSingle();
  if (!contract) return Response.json(null);

  const { data: locker } = await supabase.from('provider_lockers').select('name').eq('id', contract.locker_id).single();
  return Response.json({ ...contract, locker_name: locker?.name || null });
}
