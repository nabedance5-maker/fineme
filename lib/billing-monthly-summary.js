// お店の月額プラン（A/B/C）の、月ごとのお金のまとめ（2026-11-17 渡邉依頼）。
// 契約は「申し込んだ日から1か月ごと」（お店ごとに引き落とし日が違う）のまま、締めは暦の月でまとめて見る。
// 正本は Stripe（請求書・サブスク）。Fineme の DB からはお店の名前と返金済みの印だけを足す。
// 使う所：運営の「支払い管理」→「月ごとのまとめ」タブ（/api/admin/billing-monthly）と、毎月1日の運営向けメール（/api/cron/billing-monthly-summary）。
// 返す項目はお店の名前・プラン・金額・日付だけ（カード情報・メールアドレスは返さない）。
import { getPlanKeyByPriceId, getPlanByPriceId } from '@/lib/stripe-plans';

const JST = 9 * 3600 * 1000;

// 'YYYY-MM' → その月の日本時間の始まりと終わり（unix秒）
export function monthRange(month) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month || ''));
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const start = Date.UTC(y, mo - 1, 1) - JST;
  const end = Date.UTC(y, mo, 1) - JST;
  return { start: Math.floor(start / 1000), end: Math.floor(end / 1000) };
}

// 日本時間でいまの月・前の月
export function jstMonth(offset = 0) {
  const d = new Date(Date.now() + JST);
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`;
}

const subMeta = inv => inv?.parent?.subscription_details?.metadata || inv?.subscription_details?.metadata || inv?.metadata || {};
const linePrice = l => { const p = l.pricing?.price_details?.price || l.price?.id || l.plan?.id; return typeof p === 'string' ? p : p?.id; };
const planOfInvoice = inv => { const l = (inv?.lines?.data || []).find(x => getPlanByPriceId(linePrice(x))); return l ? getPlanKeyByPriceId(linePrice(l)) : null; };
const planOfSub = sub => { const it = (sub?.items?.data || []).find(x => getPlanByPriceId(x.price?.id)); return it ? getPlanKeyByPriceId(it.price.id) : null; };
const iso = s => (s ? new Date(s * 1000).toISOString() : null);

export async function buildMonthlySummary(stripe, db, month) {
  const range = monthRange(month);
  if (!range) throw new Error('月の指定が正しくありません（YYYY-MM）');
  const { start, end } = range;

  // 請求書：この月に払われたもの（前の月に作られて、この月にやり直しで払われたものも拾うため40日前から）
  const invoices = await stripe.invoices.list({ created: { gte: start - 40 * 86400, lt: end }, limit: 100 }).autoPagingToArray({ limit: 2000 });
  const plan = invoices.filter(inv => subMeta(inv).fineme_provider_id && planOfInvoice(inv));

  const paid = plan.filter(inv => inv.status === 'paid' && (inv.amount_paid || 0) > 0)
    .filter(inv => { const t = inv.status_transitions?.paid_at || 0; return t >= start && t < end; });
  // まだ払われていない請求（カードが通らなかった等）。この月までに作られて、今も未回収のもの
  const unpaid = plan.filter(inv => ['open', 'uncollectible'].includes(inv.status) && (inv.amount_due || 0) > 0 && inv.created < end);

  // サブスク：この月に始まったもの・この月に解約されたもの
  const [created, canceled] = await Promise.all([
    stripe.subscriptions.list({ status: 'all', created: { gte: start, lt: end }, limit: 100 }).autoPagingToArray({ limit: 1000 }),
    stripe.subscriptions.list({ status: 'canceled', limit: 100 }).autoPagingToArray({ limit: 2000 }),
  ]);
  const started = created.filter(s => s.metadata?.fineme_provider_id && planOfSub(s));
  const ended = canceled.filter(s => s.metadata?.fineme_provider_id && planOfSub(s) && s.canceled_at >= start && s.canceled_at < end);

  // お店の名前と、返金済みの印（webhook が provider_payments に付ける）
  const ids = [...new Set([...paid, ...unpaid].map(i => subMeta(i).fineme_provider_id).concat([...started, ...ended].map(s => s.metadata.fineme_provider_id)))];
  const [{ data: providers }, { data: refunds }] = await Promise.all([
    ids.length ? db.from('providers').select('id, name, slug').in('id', ids) : Promise.resolve({ data: [] }),
    paid.length ? db.from('provider_payments').select('stripe_invoice_id').in('stripe_invoice_id', paid.map(i => i.id)).eq('refunded', true) : Promise.resolve({ data: [] }),
  ]);
  const nameOf = id => (providers || []).find(p => p.id === id)?.name || '（削除されたお店）';
  const refunded = new Set((refunds || []).map(r => r.stripe_invoice_id));

  const paidRows = paid.map(inv => ({
    provider_id: subMeta(inv).fineme_provider_id,
    name: nameOf(subMeta(inv).fineme_provider_id),
    plan: planOfInvoice(inv),
    amount: inv.amount_paid,
    amount_excl_tax: typeof inv.total_excluding_tax === 'number' ? inv.total_excluding_tax : inv.amount_paid - (inv.tax || 0),
    paid_at: iso(inv.status_transitions?.paid_at),
    refunded: refunded.has(inv.id),
    invoice_id: inv.id,
  })).sort((a, b) => (a.paid_at || '').localeCompare(b.paid_at || ''));

  const unpaidRows = unpaid.map(inv => ({
    provider_id: subMeta(inv).fineme_provider_id,
    name: nameOf(subMeta(inv).fineme_provider_id),
    plan: planOfInvoice(inv),
    amount: inv.amount_due,
    billed_at: iso(inv.created),
    attempts: inv.attempt_count || 0,
    next_attempt_at: iso(inv.next_payment_attempt),
    status: inv.status, // open = まだやり直し中 / uncollectible = 回収できなかった
    invoice_id: inv.id,
  })).sort((a, b) => (a.billed_at || '').localeCompare(b.billed_at || ''));

  const subRow = s => ({
    provider_id: s.metadata.fineme_provider_id,
    name: nameOf(s.metadata.fineme_provider_id),
    plan: planOfSub(s),
    at: iso(s.canceled_at || s.created),
    // 無料モニター中に申し込んだお店（課金は trial_end から）
    first_charge_at: s.trial_end && s.trial_end > s.created ? iso(s.trial_end) : null,
  });

  const net = paidRows.filter(r => !r.refunded);
  const byPlan = {};
  for (const r of net) { const k = r.plan || '-'; byPlan[k] = byPlan[k] || { count: 0, amount: 0 }; byPlan[k].count++; byPlan[k].amount += r.amount; }

  return {
    month,
    totals: {
      paid_count: net.length,
      paid_amount: net.reduce((s, r) => s + r.amount, 0),
      paid_amount_excl_tax: net.reduce((s, r) => s + r.amount_excl_tax, 0),
      refunded_count: paidRows.length - net.length,
      unpaid_count: unpaidRows.length,
      unpaid_amount: unpaidRows.reduce((s, r) => s + r.amount, 0),
      started_count: started.length,
      ended_count: ended.length,
      by_plan: byPlan,
    },
    paid: paidRows,
    unpaid: unpaidRows,
    started: started.map(subRow),
    ended: ended.map(subRow),
  };
}

// 運営向けメールの本文（HTML）
export function summaryEmailHtml(s, adminUrl) {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const yen = n => `¥${Number(n || 0).toLocaleString('ja-JP')}`;
  const day = v => (v ? new Date(v).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric' }) : '-');
  const [y, m] = s.month.split('-');
  const t = s.totals;
  const table = (head, rows) => rows.length
    ? `<table style="border-collapse:collapse;font-size:13px;margin:4px 0 16px"><tr>${head.map(h => `<th style="text-align:left;padding:4px 10px 4px 0;border-bottom:1px solid #ddd">${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td style="padding:4px 10px 4px 0;border-bottom:1px solid #eee">${c}</td>`).join('')}</tr>`).join('')}</table>`
    : '<p style="font-size:13px;color:#666;margin:4px 0 16px">なし</p>';
  const plans = Object.entries(t.by_plan).map(([k, v]) => `PLAN ${esc(k)}：${v.count}件 ${yen(v.amount)}`).join(' ／ ') || 'なし';
  return `<div style="font-family:sans-serif;line-height:1.8;color:#1a1a1a;font-size:14px">
    <p><b>${Number(y)}年${Number(m)}月のお店の月額プラン（入金のまとめ）</b></p>
    <p style="font-size:20px;font-weight:700;margin:0">${yen(t.paid_amount)}<span style="font-size:13px;font-weight:400">（${t.paid_count}件・税抜 ${yen(t.paid_amount_excl_tax)}）</span></p>
    <p style="font-size:13px;margin-top:4px">${plans}${t.refunded_count ? `<br>返金した支払い：${t.refunded_count}件（合計から除いています）` : ''}</p>
    <p style="margin-bottom:0"><b>引き落としに失敗しているお店</b>（${t.unpaid_count}件・${yen(t.unpaid_amount)}）</p>
    ${table(['お店', 'プラン', '金額', '請求日', 'やり直し'], s.unpaid.map(r => [esc(r.name), esc(r.plan), yen(r.amount), day(r.billed_at), r.status === 'uncollectible' ? '回収できず' : `${r.attempts}回目まで・次 ${day(r.next_attempt_at)}`]))}
    <p style="margin-bottom:0"><b>入金があったお店</b></p>
    ${table(['お店', 'プラン', '金額', '入金日'], s.paid.map(r => [esc(r.name) + (r.refunded ? '（返金済み）' : ''), esc(r.plan), yen(r.amount), day(r.paid_at)]))}
    <p style="margin-bottom:0"><b>新しく申し込んだお店</b>（${t.started_count}件）</p>
    ${table(['お店', 'プラン', '申込日', '課金の開始'], s.started.map(r => [esc(r.name), esc(r.plan), day(r.at), r.first_charge_at ? `${day(r.first_charge_at)}から（無料モニター後）` : '申込日から']))}
    <p style="margin-bottom:0"><b>解約したお店</b>（${t.ended_count}件）</p>
    ${table(['お店', 'プラン', '解約日'], s.ended.map(r => [esc(r.name), esc(r.plan), day(r.at)]))}
    <p style="font-size:12px;color:#666">金額は Stripe の記録から集計しています（税込）。無料モニター中の0円の請求は含みません。<br>管理画面で見る：<a href="${adminUrl}">${adminUrl}</a></p>
  </div>`;
}
