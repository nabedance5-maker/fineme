// レジのセッション（開けてから締めるまで）の集計（でお要望 2026-10-19：hacomono差分 #12「点検・精算レポート」）。
// あるはずの現金 ＝ 準備金 ＋ 現金の売上 − 現金の返金 ＋ 入金 − 出金。
const isCashTx = t => t.payment_key === 'cash' || (!t.payment_key && t.payment_method === '現金');

// untilIso を渡さない時（開いているレジの点検）は、取り消した時刻の上限を付けない
export async function sessionSummary(db, session, untilIso = null) {
  const [{ data: txs }, { data: refunds }, { data: moves }] = await Promise.all([
    db.from('provider_pos_transactions').select('id, total_amount, discount_amount, payment_method, payment_key, status').eq('session_id', session.id).limit(5000),
    (q => (untilIso ? q.lte('refunded_at', untilIso) : q))(db.from('provider_pos_transactions').select('id, total_amount, payment_method, payment_key').eq('provider_id', session.provider_id).eq('status', 'refunded').gte('refunded_at', session.opened_at)).limit(5000),
    db.from('provider_register_cash_moves').select('kind, amount, reason, created_at, operator').eq('session_id', session.id).order('created_at'),
  ]);
  const byMethod = {};
  let sales = 0, discounts = 0, cashSales = 0;
  for (const t of txs || []) {
    const k = t.payment_method || '未選択';
    const m = byMethod[k] || (byMethod[k] = { label: k, count: 0, amount: 0, refunds: 0 });
    m.count++; m.amount += t.total_amount; sales += t.total_amount; discounts += t.discount_amount || 0;
    if (isCashTx(t)) cashSales += t.total_amount;
  }
  let refundTotal = 0, cashRefunds = 0;
  for (const t of refunds || []) {
    const k = t.payment_method || '未選択';
    const m = byMethod[k] || (byMethod[k] = { label: k, count: 0, amount: 0, refunds: 0 });
    m.refunds += t.total_amount; refundTotal += t.total_amount;
    if (isCashTx(t)) cashRefunds += t.total_amount;
  }
  const cashIn = (moves || []).filter(x => x.kind === 'in').reduce((a, x) => a + x.amount, 0);
  const cashOut = (moves || []).filter(x => x.kind === 'out').reduce((a, x) => a + x.amount, 0);
  return {
    count: (txs || []).length, sales, discounts, refunds: refundTotal, net: sales - refundTotal,
    by_method: Object.values(byMethod).sort((a, b) => b.amount - a.amount),
    opening_cash: session.opening_cash, cash_sales: cashSales, cash_refunds: cashRefunds, cash_in: cashIn, cash_out: cashOut,
    expected_cash: session.opening_cash + cashSales - cashRefunds + cashIn - cashOut,
    moves: moves || [],
  };
}
