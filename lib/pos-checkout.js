// POSの会計確定ロジック（でお要望2026-09-27：決済機能Phase6②）。
// 現金・手動記録の会計（app/api/provider/pos/checkout）と、オンライン決済確定
// （Stripe Webhook経由）の両方から呼ばれる共通処理。明細の検証・在庫引き当て・
// 売上集計への反映を1箇所にまとめ、二重実装によるズレを防ぐ。

/**
 * @param {object} supabase - service roleクライアント
 * @param {object} params
 * @param {string} params.providerId
 * @param {Array<{product_id?: string, qty: number, unit_price?: number, name?: string}>} params.items
 * @param {string|null} params.staffId
 * @param {string|null} params.paymentMethod
 * @param {string|null} params.memo
 * @param {string} [params.source] - 'pos'（既定）等
 * @returns {Promise<{transaction: object, items: object[]}>}
 */
export async function recordPosTransaction(supabase, { providerId, items, staffId, paymentMethod, memo, source }) {
  if (!Array.isArray(items) || !items.length) throw new Error('会計する商品がありません');

  const productIds = [...new Set(items.filter(it => it.product_id).map(it => it.product_id))];
  let productMap = {};
  if (productIds.length) {
    const { data: products } = await supabase
      .from('provider_products')
      .select('id, name, price, track_stock, stock_qty')
      .eq('provider_id', providerId)
      .in('id', productIds);
    (products || []).forEach(p => { productMap[p.id] = p; });
  }

  const lineItems = [];
  for (const it of items) {
    const qty = parseInt(it.qty, 10);
    if (!Number.isInteger(qty) || qty <= 0) throw new Error('数量が不正です');
    const product = it.product_id ? productMap[it.product_id] : null;
    if (it.product_id && !product) throw new Error('商品が見つかりません');
    if (product?.track_stock && product.stock_qty < qty) {
      throw new Error(`${product.name}の在庫が不足しています（残り${product.stock_qty}）`);
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
  if (totalAmount <= 0) throw new Error('合計金額は1円以上にしてください');

  const { data: salesEntry, error: salesError } = await supabase
    .from('provider_sales_entries')
    .insert({
      provider_id: providerId,
      entry_date: new Date().toISOString().split('T')[0],
      amount: totalAmount,
      menu_name: lineItems.length === 1 ? lineItems[0].name_snapshot : `物販${lineItems.length}点`,
      staff_id: staffId || null,
      payment_method: paymentMethod || null,
      memo: memo?.trim() || null,
      source: source || 'pos',
    })
    .select()
    .single();
  if (salesError) throw new Error(salesError.message);

  const { data: tx, error: txError } = await supabase
    .from('provider_pos_transactions')
    .insert({
      provider_id: providerId,
      staff_id: staffId || null,
      payment_method: paymentMethod || null,
      total_amount: totalAmount,
      memo: memo?.trim() || null,
      sales_entry_id: salesEntry.id,
    })
    .select()
    .single();
  if (txError) throw new Error(txError.message);

  const { error: itemsError } = await supabase
    .from('provider_pos_transaction_items')
    .insert(lineItems.map(it => ({ ...it, transaction_id: tx.id })));
  if (itemsError) throw new Error(itemsError.message);

  for (const it of lineItems) {
    if (!it.product_id || !productMap[it.product_id]?.track_stock) continue;
    const product = productMap[it.product_id];
    await supabase.from('provider_products').update({ stock_qty: Math.max(0, product.stock_qty - it.qty) }).eq('id', it.product_id);
    await supabase.from('provider_stock_movements').insert({
      provider_id: providerId,
      product_id: it.product_id,
      delta: -it.qty,
      reason: 'sale',
      transaction_id: tx.id,
    });
  }

  return { transaction: tx, items: lineItems };
}
