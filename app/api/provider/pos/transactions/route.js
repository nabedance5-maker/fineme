// GET /api/provider/pos/transactions → 直近のPOS会計履歴（明細付き）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: txs, error } = await supabase
    .from('provider_pos_transactions')
    .select('id, staff_id, payment_method, total_amount, memo, created_at')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!txs?.length) return Response.json([]);

  const [{ data: items }, { data: staffRows }] = await Promise.all([
    supabase.from('provider_pos_transaction_items').select('transaction_id, name_snapshot, unit_price, qty, subtotal').in('transaction_id', txs.map(t => t.id)),
    supabase.from('provider_staff').select('id, name').eq('provider_id', provider.id),
  ]);
  const staffMap = {};
  (staffRows || []).forEach(s => { staffMap[s.id] = s.name; });
  const itemsByTx = {};
  (items || []).forEach(it => { (itemsByTx[it.transaction_id] = itemsByTx[it.transaction_id] || []).push(it); });

  const result = txs.map(t => ({
    ...t,
    staff_name: t.staff_id ? staffMap[t.staff_id] || null : null,
    items: itemsByTx[t.id] || [],
  }));

  return Response.json(result);
}
