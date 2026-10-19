// GET /api/provider/pos/stock-movements?product_id= → 在庫の動き（販売・仕入・返品・棚卸し・ロス）の履歴（でお要望 2026-10-19：hacomono差分 #12）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { memberAuth } from '@/lib/provider-members';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const a = await memberAuth(request);
  if (!a) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const pid = new URL(request.url).searchParams.get('product_id');
  let q = supabase.from('provider_stock_movements').select('id, product_id, delta, reason, memo, unit_cost, supplier, operator, created_at').eq('provider_id', a.provider.id).order('created_at', { ascending: false }).limit(200);
  if (pid) q = q.eq('product_id', pid);
  const { data } = await q;
  const ids = [...new Set((data || []).map(m => m.product_id))];
  const { data: prods } = ids.length ? await supabase.from('provider_products').select('id, name').in('id', ids) : { data: [] };
  const name = Object.fromEntries((prods || []).map(p => [p.id, p.name]));
  return Response.json((data || []).map(m => ({ ...m, product_name: name[m.product_id] || '（削除した商品）' })));
}
