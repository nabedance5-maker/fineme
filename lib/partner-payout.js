// 営業パートナー・協業者への報酬の自動送金（2026-11-06 渡邉要望：紹介報酬の振込の手作業をなくしたい）。
// 規約 第5条「月末締め・翌月末払い」：毎月25日（cron /api/cron/partner-payouts）に、前月までの未払いの報酬を
// パートナーごとにまとめ、Stripe Connect の送金（transfer）で受け取り口座へ送る。Stripeから銀行への入金はStripeが自動で行う。
// 受け取り口座：パートナー本人の口座（/partner/[token] で登録）。自分のお店をFinemeで使っているパートナーで
// 本人の口座が無ければ、お店の受け取り口座へ送る。口座が無い人の報酬は保留し、登録後の送金日にまとめて送る。
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

export const jstMonth = (d = new Date()) => new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 7);

// パートナー本人の受け取り口座（Express・送金を受けるだけ）を作り、登録ページへのリンクを返す
export async function partnerOnboardingLink(sb, stripe, partner, token) {
  let id = partner.stripe_connect_id;
  if (!id) {
    const account = await stripe.accounts.create({
      type: 'express', country: 'JP', email: partner.email || undefined,
      capabilities: { transfers: { requested: true } }, business_type: 'individual',
      metadata: { fineme_sales_partner_id: String(partner.id) },
    });
    id = account.id;
    await sb.from('sales_partners').update({ stripe_connect_id: id, stripe_connect_status: 'pending' }).eq('id', partner.id);
  }
  const link = await stripe.accountLinks.create({
    account: id, type: 'account_onboarding',
    refresh_url: `${BASE}/partner/${token}?payout=refresh`,
    return_url: `${BASE}/partner/${token}?payout=done`,
  });
  return link.url;
}

// 本人の口座の状態をStripeに聞いて保存する。送金を受けられれば active
export async function refreshPartnerAccount(sb, stripe, partner) {
  if (!partner.stripe_connect_id) return null;
  const acct = await stripe.accounts.retrieve(partner.stripe_connect_id);
  const status = acct.capabilities?.transfers === 'active' ? 'active' : 'pending';
  if (status !== partner.stripe_connect_status) await sb.from('sales_partners').update({ stripe_connect_status: status }).eq('id', partner.id);
  return { status, details_submitted: !!acct.details_submitted, payouts_enabled: !!acct.payouts_enabled };
}

// 送金先：本人の口座 → 自分のお店の受け取り口座 の順
export async function payoutDestination(sb, partner) {
  if (partner.stripe_connect_id && partner.stripe_connect_status === 'active') return { id: partner.stripe_connect_id, via: 'partner' };
  if (partner.provider_id) {
    const { data: p } = await sb.from('providers').select('stripe_connect_id, stripe_connect_status').eq('id', partner.provider_id).maybeSingle();
    if (p?.stripe_connect_id && p.stripe_connect_status === 'active') return { id: p.stripe_connect_id, via: 'store' };
  }
  return null;
}

// 前月までの未払いの報酬を、パートナーごとに送る。同じ月に2回動いても二重に送らない（partner_payouts の一意制約と冪等キー）
export async function runPartnerPayouts(sb, stripe, { now = new Date() } = {}) {
  const month = jstMonth(now);
  const [{ data: std }, { data: col }, { data: partners }, { data: done }] = await Promise.all([
    sb.from('referral_rewards').select('id, referrer_id, amount, reward_month').eq('status', 'pending').lt('reward_month', month),
    sb.from('collaborator_rewards').select('id, partner_id, amount, reward_month').eq('status', 'pending').lt('reward_month', month),
    sb.from('sales_partners').select('id, name, email, provider_id, stripe_connect_id, stripe_connect_status'),
    sb.from('partner_payouts').select('partner_id').eq('payout_month', month).eq('status', 'paid'),
  ]);
  const paidThisMonth = new Set((done || []).map(d => d.partner_id));
  const by = {};
  (std || []).forEach(r => { const e = (by[r.referrer_id] = by[r.referrer_id] || { std: [], col: [] }); e.std.push(r); });
  (col || []).forEach(r => { const e = (by[r.partner_id] = by[r.partner_id] || { std: [], col: [] }); e.col.push(r); });
  const partnerOf = Object.fromEntries((partners || []).map(p => [p.id, p]));
  const result = { month, paid: [], held: [], failed: [] };

  for (const [pid, g] of Object.entries(by)) {
    const partner = partnerOf[pid];
    if (!partner || paidThisMonth.has(pid)) continue;
    const amount = [...g.std, ...g.col].reduce((a, r) => a + (r.amount || 0), 0);
    if (amount <= 0) continue;
    const dest = await payoutDestination(sb, partner);
    if (!dest) { result.held.push({ name: partner.name, amount, reason: '受け取り口座が未登録' }); continue; }
    try {
      const tr = await stripe.transfers.create({
        amount, currency: 'jpy', destination: dest.id,
        description: `Fineme 紹介報酬（${month}送金分）`,
        metadata: { fineme_sales_partner_id: pid, fineme_payout_month: month },
      }, { idempotencyKey: `partner-payout-${pid}-${month}-${amount}` });
      const at = new Date().toISOString();
      await sb.from('partner_payouts').upsert({ partner_id: pid, payout_month: month, amount, status: 'paid', stripe_transfer_id: tr.id, destination: dest.id, error: null }, { onConflict: 'partner_id,payout_month' });
      if (g.std.length) await sb.from('referral_rewards').update({ status: 'paid', paid_at: at, stripe_transfer_id: tr.id }).in('id', g.std.map(r => r.id));
      if (g.col.length) await sb.from('collaborator_rewards').update({ status: 'paid', paid_at: at, stripe_transfer_id: tr.id }).in('id', g.col.map(r => r.id));
      result.paid.push({ name: partner.name, amount, via: dest.via });
    } catch (e) {
      // Finemeの残高不足など。報酬は未払いのまま残し、運営に知らせる（次の送金日か手動のやり直しで送る）
      await sb.from('partner_payouts').upsert({ partner_id: pid, payout_month: month, amount, status: 'failed', destination: dest.id, error: String(e.message || e).slice(0, 300) }, { onConflict: 'partner_id,payout_month' });
      result.failed.push({ name: partner.name, amount, error: e.message });
    }
  }
  return result;
}
