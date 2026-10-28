// POSで会員証（QR）からお客様を呼び出し、そのお店に登録済みのカードで物販のお会計をする（でお要望 2026-10-28：
// 今野さん「お客様の会員証で何か買う時って決済できる？別で決済端末を用意しないとダメ？」→ お店のタブレットで読み取る）。
// 登録済みのカード＝そのお店の月額プランの入会でお客様が登録したカード（Stripe、Finemeのアカウント上に保存）。
// カードが無い・使えない時は、これまでの「お客様のスマホで払う（QR）」で払ってもらう。
export async function findMemberCard(supabase, stripe, providerId, userId) {
  const { data: rows } = await supabase.from('provider_memberships')
    .select('id, stripe_customer_id, stripe_payment_method_id, status, updated_at')
    .eq('provider_id', providerId).eq('user_id', userId)
    .in('status', ['active', 'paused', 'pending_approval'])
    .not('stripe_payment_method_id', 'is', null)
    .order('updated_at', { ascending: false }).limit(1);
  const m = rows?.[0];
  if (!m?.stripe_customer_id || !stripe) return null;
  // 月会費のカードを更新していれば、Stripe の既定のカードが新しい方になっている
  let pmId = m.stripe_payment_method_id;
  try {
    const cust = await stripe.customers.retrieve(m.stripe_customer_id);
    const def = cust?.invoice_settings?.default_payment_method;
    if (def) pmId = typeof def === 'string' ? def : def.id;
  } catch {}
  try {
    const pm = await stripe.paymentMethods.retrieve(pmId);
    if (!pm?.card) return null;
    return { customerId: m.stripe_customer_id, paymentMethodId: pm.id, brand: pm.card.brand, last4: pm.card.last4, expMonth: pm.card.exp_month, expYear: pm.card.exp_year };
  } catch { return null; }
}

export const cardLabel = c => (c ? `${String(c.brand || 'カード').toUpperCase()} •••• ${c.last4}` : '');
