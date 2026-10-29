// POSで会員証（QR）からお客様を呼び出し、そのお店に登録済みのカードで物販のお会計をする（でお要望 2026-10-28：
// 今野さん「お客様の会員証で何か買う時って決済できる？別で決済端末を用意しないとダメ？」→ お店のタブレットで読み取る）。
// 登録済みのカード＝そのお店の月額プランの入会でお客様が登録したカード、または「お客様のスマホで払う」の時に
// お客様が「次回からこのカードで払えるようにする」を選んだカード（provider_customer_cards。2026-10-29）。どちらもStripe、Finemeのアカウント上に保存。
// カードが無い・使えない時は、これまでの「お客様のスマホで払う（QR）」で払ってもらう。
export async function findMemberCard(supabase, stripe, providerId, userId) {
  return (await findMembershipCard(supabase, stripe, providerId, userId)) || (await findSavedCard(supabase, stripe, providerId, userId));
}

async function cardOf(stripe, customerId, pmId) {
  try {
    const pm = await stripe.paymentMethods.retrieve(pmId);
    // お客様が外したカード（Stripe上で外れている）は使わない
    if (!pm?.card || (typeof pm.customer === 'string' ? pm.customer : pm.customer?.id) !== customerId) return null;
    return { customerId, paymentMethodId: pm.id, brand: pm.card.brand, last4: pm.card.last4, expMonth: pm.card.exp_month, expYear: pm.card.exp_year };
  } catch { return null; }
}

export async function findSavedCard(supabase, stripe, providerId, userId) {
  if (!stripe) return null;
  const { data: row } = await supabase.from('provider_customer_cards').select('stripe_customer_id, stripe_payment_method_id').eq('provider_id', providerId).eq('user_id', userId).maybeSingle();
  return row ? cardOf(stripe, row.stripe_customer_id, row.stripe_payment_method_id) : null;
}

// スマホで払う時に使うStripeのお客様。そのお店で前に使ったもの（保存したカード・月額プラン）があればそれを使う
export async function stripeCustomerFor(supabase, stripe, providerId, userId, { email, name } = {}) {
  const { data: saved } = await supabase.from('provider_customer_cards').select('stripe_customer_id').eq('provider_id', providerId).eq('user_id', userId).maybeSingle();
  if (saved?.stripe_customer_id) return saved.stripe_customer_id;
  const { data: m } = await supabase.from('provider_memberships').select('stripe_customer_id').eq('provider_id', providerId).eq('user_id', userId).not('stripe_customer_id', 'is', null).order('updated_at', { ascending: false }).limit(1);
  if (m?.[0]?.stripe_customer_id) return m[0].stripe_customer_id;
  const c = await stripe.customers.create({ email, name, metadata: { fineme_user_id: userId, fineme_provider_id: providerId } });
  return c.id;
}

// スマホで払い終わった時（webhook）：支払いに使ったカードを、このお店のお客様のカードとして記録する。前のカードは置き換える
export async function saveCustomerCard(supabase, stripe, providerId, userId, session) {
  const piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
  if (!piId || !customerId) return;
  const pi = await stripe.paymentIntents.retrieve(piId);
  const pmId = typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id;
  if (!pmId || !(await cardOf(stripe, customerId, pmId))) return;
  const { data: prev } = await supabase.from('provider_customer_cards').select('stripe_customer_id, stripe_payment_method_id').eq('provider_id', providerId).eq('user_id', userId).maybeSingle();
  await supabase.from('provider_customer_cards').upsert({ provider_id: providerId, user_id: userId, stripe_customer_id: customerId, stripe_payment_method_id: pmId, updated_at: new Date().toISOString() }, { onConflict: 'provider_id,user_id' });
  if (prev && prev.stripe_payment_method_id !== pmId) await detachUnlessMembership(supabase, stripe, prev.stripe_payment_method_id);
}

// 保存したカードを外す。月額プランの支払いに使っているカードはStripe上では外さない（月会費が払えなくなるため）
export async function detachUnlessMembership(supabase, stripe, pmId) {
  const { data: used } = await supabase.from('provider_memberships').select('id').eq('stripe_payment_method_id', pmId).in('status', ['active', 'paused', 'pending_approval', 'past_due']).limit(1);
  if (used?.length) return;
  try {
    // 月会費のカードを更新した場合など、Stripe側で既定の支払い方法になっていれば外さない
    const pm = await stripe.paymentMethods.retrieve(pmId);
    const custId = typeof pm.customer === 'string' ? pm.customer : pm.customer?.id;
    if (!custId) return;
    const cust = await stripe.customers.retrieve(custId);
    const def = cust?.invoice_settings?.default_payment_method;
    if ((typeof def === 'string' ? def : def?.id) === pmId) return;
    await stripe.paymentMethods.detach(pmId);
  } catch (e) { console.error('[pos card detach]', e?.message); }
}

async function findMembershipCard(supabase, stripe, providerId, userId) {
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
