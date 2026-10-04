// GET /api/me/contract-documents → 自分宛ての契約書一覧（店舗が「お客様に表示」にしたものだけ）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('customer_contract_documents')
    .select('id, provider_id, contract_kind, title, contract_date, note, file_name, size_bytes, customer_acknowledged_at, created_at')
    .eq('user_id', user.id)
    .eq('visible_to_customer', true)
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const ids = [...new Set((data || []).map(d => d.provider_id))];
  const { data: provs } = ids.length ? await supabase.from('providers').select('id, name').in('id', ids) : { data: [] };
  const nameOf = Object.fromEntries((provs || []).map(p => [p.id, p.name]));
  return Response.json((data || []).map(({ provider_id, ...d }) => ({ ...d, provider_name: nameOf[provider_id] || '' })));
}
