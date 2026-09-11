// GET  /api/provider/products → 自店舗の商品（物販）一覧
// POST /api/provider/products → 商品を新規作成
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

  const { data, error } = await supabase
    .from('provider_products')
    .select('id, name, price, track_stock, stock_qty, active, sort_order, created_at')
    .eq('provider_id', provider.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, price, track_stock, stock_qty } = await request.json().catch(() => ({}));
  if (!name?.trim()) return Response.json({ error: 'nameは必須です' }, { status: 400 });

  const trackStock = track_stock === undefined ? true : !!track_stock;
  const { data, error } = await supabase
    .from('provider_products')
    .insert({
      provider_id: provider.id,
      name: name.trim(),
      price: Number.isFinite(parseInt(price, 10)) ? parseInt(price, 10) : 0,
      track_stock: trackStock,
      stock_qty: trackStock && Number.isFinite(parseInt(stock_qty, 10)) ? parseInt(stock_qty, 10) : 0,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
