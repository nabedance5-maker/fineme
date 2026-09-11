// PATCH  /api/provider/products/[id] → 商品情報の編集・在庫の入荷/棚卸修正
// DELETE /api/provider/products/[id] → 商品を削除（過去のPOS明細はname_snapshotで独立して残る）
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
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = {};
  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim();
  if (body.price !== undefined) update.price = Number.isFinite(parseInt(body.price, 10)) ? parseInt(body.price, 10) : 0;
  if (typeof body.active === 'boolean') update.active = body.active;
  if (typeof body.track_stock === 'boolean') update.track_stock = body.track_stock;
  if (Number.isFinite(parseInt(body.sort_order, 10))) update.sort_order = parseInt(body.sort_order, 10);

  // 在庫の入荷・棚卸修正（今野くんの実地メモ：POSは物販在庫管理とセットで意味がある）。
  // stock_deltaが渡された時だけ数量を増減し、provider_stock_movementsに記録する。
  const delta = parseInt(body.stock_delta, 10);
  if (Number.isFinite(delta) && delta !== 0) {
    const { data: current } = await supabase
      .from('provider_products')
      .select('stock_qty')
      .eq('id', params.id)
      .eq('provider_id', provider.id)
      .single();
    if (!current) return Response.json({ error: '商品が見つかりません' }, { status: 404 });
    update.stock_qty = Math.max(0, (current.stock_qty || 0) + delta);
    await supabase.from('provider_stock_movements').insert({
      provider_id: provider.id,
      product_id: params.id,
      delta,
      reason: ['restock', 'adjustment'].includes(body.reason) ? body.reason : 'adjustment',
      memo: body.memo?.trim() || null,
    });
  }

  if (!Object.keys(update).length) return Response.json({ error: '更新項目がありません' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_products')
    .update(update)
    .eq('id', params.id)
    .eq('provider_id', provider.id)
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

  const { error } = await supabase
    .from('provider_products')
    .delete()
    .eq('id', params.id)
    .eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
