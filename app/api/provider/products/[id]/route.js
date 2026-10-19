// PATCH  /api/provider/products/[id] → 商品情報の編集・在庫の入荷/棚卸修正
// DELETE /api/provider/products/[id] → 商品を削除（過去のPOS明細はname_snapshotで独立して残る）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

async function __PATCH(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'pos'); if (locked) return locked; }

  const body = await request.json().catch(() => ({}));
  const update = {};
  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim();
  if (body.price !== undefined) update.price = Number.isFinite(parseInt(body.price, 10)) ? parseInt(body.price, 10) : 0;
  if (typeof body.active === 'boolean') update.active = body.active;
  if (typeof body.track_stock === 'boolean') update.track_stock = body.track_stock;
  if (Number.isFinite(parseInt(body.sort_order, 10))) update.sort_order = parseInt(body.sort_order, 10);
  // カテゴリ・仕入値・在庫が少ない時の目安（でお要望 2026-10-19：hacomono差分 #12）
  if ('category' in body) update.category = String(body.category || '').trim().slice(0, 30) || null;
  if ('cost_price' in body) update.cost_price = body.cost_price === '' || body.cost_price == null ? null : Math.max(0, parseInt(body.cost_price, 10) || 0);
  if ('low_stock_threshold' in body) update.low_stock_threshold = body.low_stock_threshold === '' || body.low_stock_threshold == null ? null : Math.max(0, parseInt(body.low_stock_threshold, 10) || 0);

  // 在庫の入荷・棚卸修正（今野くんの実地メモ：POSは物販在庫管理とセットで意味がある）。
  // stock_deltaが渡された時だけ数量を増減し、provider_stock_movementsに記録する。
  // 棚卸し：数えた数（stock_count）を渡すと、差分を記録して在庫数をその数にする
  const counted = parseInt(body.stock_count, 10);
  let delta = parseInt(body.stock_delta, 10);
  let reason = ['restock', 'adjustment', 'purchase', 'loss'].includes(body.reason) ? body.reason : 'adjustment';
  if (Number.isFinite(counted) && counted >= 0) {
    const { data: cur } = await supabase.from('provider_products').select('stock_qty').eq('id', params.id).eq('provider_id', provider.id).single();
    if (!cur) return Response.json({ error: '商品が見つかりません' }, { status: 404 });
    delta = counted - (cur.stock_qty || 0);
    reason = 'stocktake';
    if (delta === 0) update.stock_qty = counted;
  }
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
      reason,
      memo: body.memo?.trim() || null,
      unit_cost: reason === 'purchase' && Number.isFinite(parseInt(body.unit_cost, 10)) ? parseInt(body.unit_cost, 10) : null,
      supplier: reason === 'purchase' ? String(body.supplier || '').trim().slice(0, 60) || null : null,
    });
    // 仕入の時は、仕入値を商品の最新の仕入値として残す
    if (reason === 'purchase' && Number.isFinite(parseInt(body.unit_cost, 10))) update.cost_price = parseInt(body.unit_cost, 10);
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

async function __DELETE(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'pos'); if (locked) return locked; }

  const { error } = await supabase
    .from('provider_products')
    .delete()
    .eq('id', params.id)
    .eq('provider_id', provider.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
