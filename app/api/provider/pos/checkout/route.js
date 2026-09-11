// POST /api/provider/pos/checkout → 会計確定。明細をprovider_pos_transactions/_itemsに記録し、
// 在庫を引き当て、provider_sales_entriesに集計1行を書き込む（既存の売上集計GETロジックは無変更）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { items, staff_id, payment_method, memo } = await request.json().catch(() => ({}));
  if (!Array.isArray(items) || !items.length) {
    return Response.json({ error: '会計する商品がありません' }, { status: 400 });
  }

  // 商品IDが渡っている分だけ実在確認・在庫チェック（カスタム項目＝product_idなしの明細も許可）
  const productIds = [...new Set(items.filter(it => it.product_id).map(it => it.product_id))];
  let productMap = {};
  if (productIds.length) {
    const { data: products } = await supabase
      .from('provider_products')
      .select('id, name, price, track_stock, stock_qty')
      .eq('provider_id', provider.id)
      .in('id', productIds);
    (products || []).forEach(p => { productMap[p.id] = p; });
  }

  const lineItems = [];
  for (const it of items) {
    const qty = parseInt(it.qty, 10);
    if (!Number.isInteger(qty) || qty <= 0) return Response.json({ error: '数量が不正です' }, { status: 400 });
    const product = it.product_id ? productMap[it.product_id] : null;
    if (it.product_id && !product) return Response.json({ error: '商品が見つかりません' }, { status: 404 });
    if (product?.track_stock && product.stock_qty < qty) {
      return Response.json({ error: `${product.name}の在庫が不足しています（残り${product.stock_qty}）` }, { status: 400 });
    }
    const unitPrice = product ? product.price : (Number.isFinite(parseInt(it.unit_price, 10)) ? parseInt(it.unit_price, 10) : 0);
    lineItems.push({
      product_id: it.product_id || null,
      name_snapshot: product ? product.name : (it.name?.trim() || '商品'),
      unit_price: unitPrice,
      qty,
      subtotal: unitPrice * qty,
    });
  }

  const totalAmount = lineItems.reduce((sum, it) => sum + it.subtotal, 0);
  if (totalAmount <= 0) return Response.json({ error: '合計金額は1円以上にしてください' }, { status: 400 });

  // ①集計行をprovider_sales_entriesへ（既存の売上タブの集計に自動で乗る）
  const { data: salesEntry, error: salesError } = await supabase
    .from('provider_sales_entries')
    .insert({
      provider_id: provider.id,
      entry_date: new Date().toISOString().split('T')[0],
      amount: totalAmount,
      menu_name: lineItems.length === 1 ? lineItems[0].name_snapshot : `物販${lineItems.length}点`,
      staff_id: staff_id || null,
      payment_method: payment_method || null,
      memo: memo?.trim() || null,
      source: 'pos',
    })
    .select()
    .single();
  if (salesError) return Response.json({ error: salesError.message }, { status: 500 });

  // ②レシート本体
  const { data: tx, error: txError } = await supabase
    .from('provider_pos_transactions')
    .insert({
      provider_id: provider.id,
      staff_id: staff_id || null,
      payment_method: payment_method || null,
      total_amount: totalAmount,
      memo: memo?.trim() || null,
      sales_entry_id: salesEntry.id,
    })
    .select()
    .single();
  if (txError) return Response.json({ error: txError.message }, { status: 500 });

  // ③明細
  const { error: itemsError } = await supabase
    .from('provider_pos_transaction_items')
    .insert(lineItems.map(it => ({ ...it, transaction_id: tx.id })));
  if (itemsError) return Response.json({ error: itemsError.message }, { status: 500 });

  // ④在庫引き当て＋movementログ（track_stockの商品のみ）
  for (const it of lineItems) {
    if (!it.product_id || !productMap[it.product_id]?.track_stock) continue;
    const product = productMap[it.product_id];
    await supabase.from('provider_products').update({ stock_qty: Math.max(0, product.stock_qty - it.qty) }).eq('id', it.product_id);
    await supabase.from('provider_stock_movements').insert({
      provider_id: provider.id,
      product_id: it.product_id,
      delta: -it.qty,
      reason: 'sale',
      transaction_id: tx.id,
    });
  }

  return Response.json({ transaction: tx, items: lineItems });
}
