// POSの会計確定ロジック（でお要望2026-09-27：決済機能Phase6②）。
// 現金・手動記録の会計（app/api/provider/pos/checkout）と、オンライン決済確定
// （Stripe Webhook経由）の両方から呼ばれる共通処理。明細の検証・在庫引き当て・
// 売上集計への反映を1箇所にまとめ、二重実装によるズレを防ぐ。
// 2026-10-19（hacomono差分 #12）：施術メニュー・手入力の明細、明細ごと／会計全体の割引、
// お客様の紐付け、支払方法の設定、レジのセッション、レシート番号、返品・取り消しを追加。

export const DEFAULT_PAYMENT_METHODS = [
  { key: 'cash', label: '現金', cash: true },
  { key: 'card', label: 'クレジットカード' },
  { key: 'paypay', label: 'PayPay' },
  { key: 'emoney', label: '電子マネー' },
  { key: 'other', label: 'その他' },
];

export async function posSettings(supabase, providerId) {
  const { data } = await supabase.from('provider_pos_settings').select('*').eq('provider_id', providerId).maybeSingle();
  return { payment_methods: DEFAULT_PAYMENT_METHODS, tax_rate: 10, ...(data || {}), ...(data?.payment_methods?.length ? {} : { payment_methods: DEFAULT_PAYMENT_METHODS }) };
}

// 割引 {type: amount|percent|price, value} を、元の金額に対する値引き額にする（0〜元の金額）
function discountOf(base, d, qty = 1) {
  if (!d || !d.type) return 0;
  const v = Number(d.value);
  if (!Number.isFinite(v) || v < 0) return 0;
  let off = 0;
  if (d.type === 'amount') off = Math.round(v);
  else if (d.type === 'percent') off = Math.round(base * Math.min(100, v) / 100);
  else if (d.type === 'price') off = base - Math.round(v) * qty;
  return Math.max(0, Math.min(base, off));
}

const jstDate = (d = new Date()) => new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 10);

// 明細の検証と金額の計算（在庫の引き当て・記録はしない）。オンライン決済の発行時と会計確定時で共通
export async function priceItems(supabase, providerId, items, discount) {
  if (!Array.isArray(items) || !items.length) throw new Error('会計する商品がありません');
  if (items.length > 100) throw new Error('明細が多すぎます');

  const productIds = [...new Set(items.filter(it => it.product_id).map(it => it.product_id))];
  const serviceIds = [...new Set(items.filter(it => it.service_id).map(it => it.service_id))];
  const productMap = {};
  const serviceMap = {};
  if (productIds.length) {
    const { data } = await supabase.from('provider_products').select('id, name, price, track_stock, stock_qty').eq('provider_id', providerId).in('id', productIds);
    (data || []).forEach(p => { productMap[p.id] = p; });
  }
  if (serviceIds.length) {
    const { data } = await supabase.from('provider_services').select('id, name, price').eq('provider_id', providerId).in('id', serviceIds);
    (data || []).forEach(s => { serviceMap[s.id] = s; });
  }

  const needQty = {};
  const lineItems = [];
  for (const it of items) {
    const qty = parseInt(it.qty, 10);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 999) throw new Error('数量が正しくありません');
    const kind = it.kind || (it.product_id ? 'product' : it.service_id ? 'service' : 'custom');
    let name, unitPrice, productId = null, serviceId = null;
    if (kind === 'product') {
      const p = productMap[it.product_id];
      if (!p) throw new Error('商品が見つかりません');
      needQty[p.id] = (needQty[p.id] || 0) + qty;
      if (p.track_stock && p.stock_qty < needQty[p.id]) throw new Error(`${p.name}の在庫が足りません（残り${p.stock_qty}）`);
      name = p.name; unitPrice = p.price; productId = p.id;
    } else if (kind === 'service') {
      const s = serviceMap[it.service_id];
      if (!s) throw new Error('メニューが見つかりません');
      name = s.name; unitPrice = Number(s.price) || 0; serviceId = s.id;
    } else {
      name = String(it.name || '').trim().slice(0, 60) || 'その他';
      unitPrice = parseInt(it.unit_price, 10);
      if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 10000000) throw new Error('金額が正しくありません');
    }
    const base = unitPrice * qty;
    const off = discountOf(base, it.discount, qty);
    lineItems.push({ kind, product_id: productId, service_id: serviceId, name_snapshot: name, unit_price: unitPrice, qty, discount_amount: off, subtotal: base - off });
  }

  const subtotal = lineItems.reduce((sum, it) => sum + it.subtotal, 0);
  const cartOff = discountOf(subtotal, discount);
  const totalAmount = subtotal - cartOff;
  if (totalAmount <= 0) throw new Error('合計金額は1円以上にしてください');
  return { lineItems, subtotal, cartOff, totalAmount, needQty, productMap };

}

/**
 * @param {object} supabase - service roleクライアント
 * @param {object} params
 * @param {string} params.providerId
 * @param {Array<{kind?: 'product'|'service'|'custom', product_id?: string, service_id?: string, qty: number, unit_price?: number, name?: string, discount?: {type: string, value: number}}>} params.items
 * @param {string|null} params.staffId
 * @param {string|null} params.paymentMethod - 表示名（オンライン決済など支払方法の設定に無いもの）
 * @param {string|null} [params.paymentKey] - 支払方法の設定のキー
 * @param {string|null} params.memo
 * @param {{type: string, value: number, label?: string}} [params.discount] - 会計全体の割引
 * @param {{user_id?: string, manual_id?: string, name?: string}} [params.customer]
 * @param {number} [params.cashReceived] - お預かり（現金）
 * @param {string} [params.operator]
 * @param {string} [params.source] - 'pos'（既定）等
 * @returns {Promise<{transaction: object, items: object[]}>}
 */
export async function recordPosTransaction(supabase, { providerId, items, staffId, paymentMethod, paymentKey, memo, source, discount, customer, cashReceived, operator }) {
  const { lineItems, subtotal, cartOff, totalAmount, needQty, productMap } = await priceItems(supabase, providerId, items, discount);

  // 支払方法：設定のキーから表示名を引く（設定に無いキーは使わない）
  let payLabel = paymentMethod || null;
  let payKey = null;
  let isCash = false;
  if (paymentKey) {
    const st = await posSettings(supabase, providerId);
    const m = st.payment_methods.find(x => x.key === paymentKey);
    if (!m) throw new Error('支払方法が正しくありません');
    payLabel = m.label; payKey = m.key; isCash = !!m.cash;
  }
  const received = isCash && Number.isFinite(parseInt(cashReceived, 10)) ? parseInt(cashReceived, 10) : null;
  if (received != null && received < totalAmount) throw new Error('お預かりが合計より少ないです');

  // お客様：この店舗のお客様か確かめる（非会員は店舗の非会員台帳から）
  let customerUserId = null, customerManualId = null, customerName = null;
  if (customer?.manual_id) {
    const { data: mc } = await supabase.from('provider_manual_customers').select('id, display_name').eq('id', customer.manual_id).eq('provider_id', providerId).maybeSingle();
    if (mc) { customerManualId = mc.id; customerName = mc.display_name; }
  } else if (customer?.user_id) {
    customerUserId = customer.user_id;
    customerName = String(customer.name || '').slice(0, 60) || null;
  }

  // 開いているレジ（あれば会計を結び付け、締めの集計に使う）
  const { data: session } = await supabase.from('provider_register_sessions').select('id').eq('provider_id', providerId).is('closed_at', null).maybeSingle();
  const today = jstDate();
  const { count } = await supabase.from('provider_pos_transactions').select('id', { count: 'exact', head: true }).eq('provider_id', providerId).gte('created_at', new Date(`${today}T00:00:00+09:00`).toISOString());
  const receiptNo = `${today.replace(/-/g, '')}-${String((count || 0) + 1).padStart(4, '0')}`;

  const { data: salesEntry, error: salesError } = await supabase
    .from('provider_sales_entries')
    .insert({
      provider_id: providerId,
      entry_date: today,
      amount: totalAmount,
      menu_name: lineItems.length === 1 ? lineItems[0].name_snapshot : `${lineItems[0].name_snapshot}ほか${lineItems.length - 1}点`.slice(0, 80),
      staff_id: staffId || null,
      payment_method: payLabel,
      memo: [memo?.trim(), customerName && `お客様：${customerName}`, cartOff ? `割引 ¥${cartOff.toLocaleString()}` : null].filter(Boolean).join('・') || null,
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
      customer_user_id: customerUserId,
      customer_manual_id: customerManualId,
      customer_name: customerName,
      payment_method: payLabel,
      payment_key: payKey,
      cash_received: received,
      subtotal_amount: subtotal,
      discount_amount: cartOff,
      discount_label: cartOff ? String(discount?.label || '').slice(0, 40) || null : null,
      total_amount: totalAmount,
      memo: memo?.trim() || null,
      sales_entry_id: salesEntry.id,
      receipt_no: receiptNo,
      session_id: session?.id || null,
      operator: operator || null,
    })
    .select()
    .single();
  if (txError) throw new Error(txError.message);

  const { error: itemsError } = await supabase
    .from('provider_pos_transaction_items')
    .insert(lineItems.map(it => ({ ...it, transaction_id: tx.id })));
  if (itemsError) throw new Error(itemsError.message);

  for (const [pid, qty] of Object.entries(needQty)) {
    const product = productMap[pid];
    if (!product?.track_stock) continue;
    await supabase.from('provider_products').update({ stock_qty: Math.max(0, product.stock_qty - qty) }).eq('id', pid);
    await supabase.from('provider_stock_movements').insert({ provider_id: providerId, product_id: pid, delta: -qty, reason: 'sale', transaction_id: tx.id, operator: operator || null });
  }

  return { transaction: tx, items: lineItems };
}

// 返品・会計の取り消し：在庫を戻し、売上にマイナスの行を入れる（元の売上は消さず、記録として残す）
export async function refundPosTransaction(supabase, { providerId, transactionId, reason, operator }) {
  const { data: tx } = await supabase.from('provider_pos_transactions').select('*').eq('id', transactionId).eq('provider_id', providerId).maybeSingle();
  if (!tx) throw new Error('会計が見つかりません');
  if (tx.status === 'refunded') throw new Error('この会計はすでに取り消し済みです');
  const { data: items } = await supabase.from('provider_pos_transaction_items').select('product_id, qty, kind, name_snapshot').eq('transaction_id', tx.id);
  const today = jstDate();
  const { data: neg, error } = await supabase.from('provider_sales_entries').insert({
    provider_id: providerId, entry_date: today, amount: -tx.total_amount,
    menu_name: `返品・取り消し（${tx.receipt_no || '会計'}）`.slice(0, 80), staff_id: tx.staff_id, payment_method: tx.payment_method,
    memo: reason ? String(reason).slice(0, 200) : null, source: 'pos',
  }).select('id').single();
  if (error) throw new Error(error.message);
  for (const it of items || []) {
    if (!it.product_id || it.kind !== 'product') continue;
    const { data: p } = await supabase.from('provider_products').select('stock_qty, track_stock').eq('id', it.product_id).maybeSingle();
    if (!p?.track_stock) continue;
    await supabase.from('provider_products').update({ stock_qty: p.stock_qty + it.qty }).eq('id', it.product_id);
    await supabase.from('provider_stock_movements').insert({ provider_id: providerId, product_id: it.product_id, delta: it.qty, reason: 'refund', transaction_id: tx.id, operator: operator || null });
  }
  // 返金した現金は、取り消した時刻に開いているレジの締めで差し引く（refunded_at で判定）
  await supabase.from('provider_pos_transactions').update({
    status: 'refunded', refunded_at: new Date().toISOString(), refund_reason: reason ? String(reason).slice(0, 200) : null, refund_sales_entry_id: neg.id,
  }).eq('id', tx.id);
  return { ok: true };
}
