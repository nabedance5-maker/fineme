// 請求（provider_invoices）の共通処理。
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

export const payUrl = id => `${BASE_URL}/pay/${id}`;

// 会員のお客様が、その店舗と関わりがあるか（予約・New Me Log連携・入会・LINE連携のいずれか）。
// 無関係な会員へ請求のLINE通知を送れないようにするためのガード。
export async function hasCustomerRelation(db, providerId, userId, providerSlug) {
  const checks = [
    db.from('reservations').select('id').eq('provider_id', providerId).eq('user_id', userId).limit(1),
    db.from('provider_memberships').select('id').eq('provider_id', providerId).eq('user_id', userId).limit(1),
    db.from('provider_customer_line_links').select('user_id').eq('provider_id', providerId).eq('user_id', userId).limit(1),
  ];
  if (providerSlug) checks.push(db.from('user_service_logs').select('id').eq('provider_slug', providerSlug).eq('user_id', userId).limit(1));
  const results = await Promise.all(checks);
  return results.some(r => (r.data || []).length > 0);
}

// 未払いの請求を入金済みにし、売上管理へ1行記録する。二重呼び出しでも1回しか記録しない。
export async function markInvoicePaid(db, invoiceId, { method, paymentIntentId }) {
  const { data: invoice } = await db.from('provider_invoices')
    .update({ status: 'paid', paid_method: method, paid_at: new Date().toISOString(), stripe_payment_intent_id: paymentIntentId || null })
    .eq('id', invoiceId).eq('status', 'unpaid')
    .select('id, provider_id, title, amount, customer_name')
    .maybeSingle();
  if (!invoice) return null;
  const { data: sale } = await db.from('provider_sales_entries').insert({
    provider_id: invoice.provider_id,
    entry_date: new Date().toISOString().split('T')[0],
    amount: invoice.amount,
    menu_name: invoice.title,
    payment_method: method === 'online' ? 'オンライン決済' : '請求（店舗で入金確認）',
    memo: invoice.customer_name ? `請求：${invoice.customer_name}` : '請求',
    source: 'manual',
  }).select('id').maybeSingle();
  if (sale?.id) await db.from('provider_invoices').update({ sales_entry_id: sale.id }).eq('id', invoice.id);
  return invoice;
}
