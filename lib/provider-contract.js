// お店の Fineme 利用契約（月額プラン）が有効かどうか（2026-10-30）。
// 使える機能はプラン（provider.plan）で決まるが、プランを選んだだけでは使えない。
// 月額を払っている（Stripe のサブスクが有効）か、運営が付けた特例無料（plan='special'）の時だけ使える。
// middleware（/api/provider/* の入口）・管理画面の契約画面・公開の可否・管理画面の表示で共通に使う。

// past_due（引き落とし失敗・Stripe がやり直している最中）は、すぐには止めない（管理画面に支払い方法の更新を促す）
// monitor（無料モニター店舗・2026-11-16）：スタンダードを monitor_until まで無料で使える。期限が来たら
// /api/cron/monitor-expiry が billing_status を null に戻す（自動で有料にはしない）。ここでも期限を見るので、cron が遅れても止まる
// （monitor_until を読んでいない呼び出し元では cron 任せになる）
export const PAID_BILLING_STATUSES = ['active', 'trialing', 'past_due', 'monitor'];

export function monitorActive(provider, now = Date.now()) {
  if (provider?.billing_status !== 'monitor') return false;
  return !provider.monitor_until || new Date(provider.monitor_until).getTime() > now;
}

export function contractActive(provider) {
  if (!provider) return false;
  if (provider.plan === 'special') return true;
  if (provider.billing_status === 'monitor') return monitorActive(provider);
  return PAID_BILLING_STATUSES.includes(provider.billing_status);
}

// 無料モニターの期限：今日から months か月後の日本時間 23:59:59（月末をまたぐ時は、その月の末日に丸める）
export function monitorUntilFrom(start = new Date(), months = 3) {
  const jst = new Date(start.getTime() + 9 * 3600000);
  const y = jst.getUTCFullYear(), m = jst.getUTCMonth() + months, d = jst.getUTCDate();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const day = Math.min(d, last);
  return new Date(Date.UTC(y, m, day, 23, 59, 59) - 9 * 3600000);
}

// 契約前でも使える掲載者向けAPI（契約画面・ログイン・パスワード変更に要るものだけ）
const CONTRACT_FREE_APIS = ['/api/provider/me', '/api/provider/terms-agreement', '/api/provider/account-settings'];

export function contractFreeApi(pathname) {
  return CONTRACT_FREE_APIS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

// 月額が止まった（解約・未払い）お店は公開ページを閉じ、また払われたら、契約が理由で閉じていた分だけ公開に戻す（Stripe webhook から）
export async function syncContractVisibility(db, providerId, billingStatus) {
  const { data: p } = await db.from('providers').select('plan, published, billing_unpublished').eq('id', providerId).maybeSingle();
  if (!p || p.plan === 'special') return;
  if (PAID_BILLING_STATUSES.includes(billingStatus)) {
    if (p.billing_unpublished) await db.from('providers').update({ published: true, billing_unpublished: false }).eq('id', providerId);
  } else if (p.published) {
    await db.from('providers').update({ published: false, billing_unpublished: true }).eq('id', providerId);
  }
}
