// 月会費の請求日・初月の扱い・退会の締め日（でお指摘 2026-10-27：お店で決める一律の請求日・締め日が無いと
// トラブルになる。あわせて、以前の日割りは「承認した日〜入会希望日の前日」を請求しており、入会前の日数まで
// お客様に払わせる誤りだった）。
//
// 店舗の設定（provider_membership_settings）
//   billing_mode   : 'fixed_day'（全員 毎月◯日に請求）| 'anniversary'（入会日と同じ日に毎月請求）
//   billing_day    : 1〜28、31＝末日（fixed_day のとき）
//   first_month    : 'prorate'（入会日〜最初の請求日の前日を日割り）| 'full'（初月も1か月分）| 'free'（最初の請求日まで無料）
//   cancel_cutoff_day         : fixed_day のとき「毎月◯日締め」。締め日までの退会申請は次の請求日の前日で退会
//   cancel_cutoff_days_before : anniversary のとき「次の請求日の◯日前まで」
// 締め日を過ぎた退会申請は、もう1回分請求してから、その次の請求日の前日で退会になる。
//
// 日付はすべて日本時間の YYYY-MM-DD。請求はその日の0時（日本時間）に行う。

export const BILLING_MODES = { fixed_day: '全員 毎月同じ日に請求', anniversary: '入会日と同じ日に毎月請求' };
export const FIRST_MONTH = { prorate: '日割りで請求', full: '1か月分を請求', free: '無料（次の請求日から）' };
export const DEFAULT_CYCLE = { billing_mode: 'fixed_day', billing_day: 1, first_month: 'prorate', cancel_cutoff_day: 20, cancel_cutoff_days_before: 10 };

const pad = n => String(n).padStart(2, '0');
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1〜12
const parts = s => s.split('-').map(Number);
const make = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
export const addDays = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const jstToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
export const jstTs = date => Math.floor(Date.parse(`${date}T00:00:00+09:00`) / 1000);
export const tsToJst = ts => (ts ? new Date(ts * 1000 + 9 * 3600000).toISOString().slice(0, 10) : null);

export function normalizeCycle(s) {
  const c = s || {};
  const day = Math.floor(Number(c.billing_day));
  const cut = Math.floor(Number(c.cancel_cutoff_day));
  const before = Math.floor(Number(c.cancel_cutoff_days_before));
  let first = FIRST_MONTH[c.first_month] ? c.first_month : null;
  // 以前の設定（prorate_first_month）からの引き継ぎ
  if (!first) first = c.prorate_first_month === false ? 'full' : DEFAULT_CYCLE.first_month;
  return {
    billing_mode: BILLING_MODES[c.billing_mode] ? c.billing_mode : DEFAULT_CYCLE.billing_mode,
    billing_day: (day >= 1 && day <= 28) || day === 31 ? day : DEFAULT_CYCLE.billing_day,
    first_month: first,
    cancel_cutoff_day: (cut >= 1 && cut <= 28) || cut === 31 ? cut : DEFAULT_CYCLE.cancel_cutoff_day,
    cancel_cutoff_days_before: before >= 0 && before <= 27 ? before : DEFAULT_CYCLE.cancel_cutoff_days_before,
  };
}

// その月の「◯日」（31＝末日、短い月は末日に寄せる）
function dayIn(y, m, day) { return make(y, m, Math.min(day, lastDay(y, m))); }
function addMonths(y, m, n) { const t = y * 12 + (m - 1) + n; return [Math.floor(t / 12), (t % 12) + 1]; }

// date より後（after=true）／以降の、最初の「毎月 day 日」
export function nextDayOfMonth(date, day, { strictlyAfter = true } = {}) {
  const [y, m] = parts(date);
  for (let i = 0; i < 3; i++) {
    const [yy, mm] = addMonths(y, m, i);
    const cand = dayIn(yy, mm, day);
    if (strictlyAfter ? cand > date : cand >= date) return cand;
  }
  return null;
}
// 請求日 date の1か月後（請求日の「日」を保つ。31＝末日）
export function nextBillingAfter(date, anchorDay) {
  const [y, m] = parts(date);
  const [yy, mm] = addMonths(y, m, 1);
  return dayIn(yy, mm, anchorDay);
}
function prevBillingBefore(date, anchorDay) {
  const [y, m] = parts(date);
  const [yy, mm] = addMonths(y, m, -1);
  return dayIn(yy, mm, anchorDay);
}

// 請求の「日」（Stripe の請求日をそろえる基準）。入会日基準なら入会日の日
// （Stripe と同じく、その日が無い月は末日。例：30日始まりなら 2/28、3/30）
export function anchorDayFor(cycle, startDate) {
  const c = normalizeCycle(cycle);
  return c.billing_mode === 'fixed_day' ? c.billing_day : parts(startDate)[2];
}

// 入会日（課金開始日）から、最初の請求の組み立てを返す（表示・Stripe 共通）
//   start           : 会員としての開始日（入会日。承認が入会日より後なら承認日）
//   firstFullDate   : 1か月分を初めて請求する日（以後この日付で毎月）
//   partial         : 開始日〜firstFullDate の前日の端数期間（無ければ null）{ from, to, days, periodDays, amount }
//   charges         : 予定の請求 [{ date, label, amount }]（入会金は承認時）
export function firstBilling(cycle, { startDate, monthlyTotal = 0, initialFee = 0 }) {
  const c = normalizeCycle(cycle);
  const anchorDay = anchorDayFor(c, startDate);
  const firstFullDate = c.billing_mode === 'fixed_day' ? nextDayOfMonth(startDate, anchorDay, { strictlyAfter: false }) : startDate;
  let partial = null;
  if (firstFullDate !== startDate) {
    const periodStart = prevBillingBefore(firstFullDate, anchorDay);
    const days = daysBetween(startDate, firstFullDate);
    const periodDays = daysBetween(periodStart, firstFullDate);
    const amount = c.first_month === 'prorate' ? Math.round(monthlyTotal * days / periodDays) : c.first_month === 'full' ? monthlyTotal : 0;
    partial = { from: startDate, to: addDays(firstFullDate, -1), days, periodDays, amount };
  }
  const charges = [];
  if (initialFee > 0) charges.push({ date: null, label: '入会金（承認時）', amount: initialFee });
  if (partial && partial.amount > 0) {
    charges.push({
      date: c.first_month === 'full' ? null : startDate,
      label: c.first_month === 'prorate'
        ? `初月の日割り（${md(partial.from)}〜${md(partial.to)}の${partial.days}日分）`
        : `初月分（${md(partial.from)}〜${md(partial.to)}・承認時）`,
      amount: partial.amount,
    });
  }
  charges.push({ date: firstFullDate, label: `月会費（以後 毎月${anchorDay === 31 ? '末日' : `${anchorDay}日`}）`, amount: monthlyTotal });
  return { start: startDate, anchorDay, firstFullDate, partial, charges, cycle: c };
}

const md = s => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;

// Stripe のサブスク作成に渡す請求のタイミング。now は「いま」の秒
//   入会日が未来 → trial_end＝入会日（それまで請求しない）。日割りは入会日に、1か月分は最初の請求日に請求
//   入会日が今日 → 今日の0時に開始（backdate）して、日割りはその場で請求
// first_month='full' の端数期間は Stripe の日割りを使わず、1か月分を最初の請求書に足す（fullFirstMonth）
export function stripeTiming(cycle, { startDate, now = Math.floor(Date.now() / 1000) }) {
  const fb = firstBilling(cycle, { startDate });
  const startTs = jstTs(startDate);
  const future = startTs > now + 60;
  const params = { proration_behavior: 'none' };
  if (future) params.trial_end = startTs;
  if (fb.partial) {
    params.billing_cycle_anchor = jstTs(fb.firstFullDate);
    if (fb.cycle.first_month === 'prorate') params.proration_behavior = 'create_prorations';
    if (!future && startTs < now - 60) params.backdate_start_date = startTs;
  }
  return { params, fullFirstMonth: !!fb.partial && fb.cycle.first_month === 'full', billing: fb };
}

// 退会の締め日。boundary（次の請求日）に間に合う申請の最終日
export function cancelCutoffFor(cycle, boundary) {
  const c = normalizeCycle(cycle);
  if (c.billing_mode === 'anniversary') return addDays(boundary, -c.cancel_cutoff_days_before);
  // 「毎月◯日締め」：請求日より前で、いちばん近い◯日
  const [y, m] = parts(boundary);
  const same = dayIn(y, m, c.cancel_cutoff_day);
  if (same < boundary) return same;
  const [py, pm] = addMonths(y, m, -1);
  return dayIn(py, pm, c.cancel_cutoff_day);
}

// 退会申請日 requestDate と、次の請求日 nextBilling（Stripe の current_period_end の日付）から、
// 退会の日を決める。締め日までなら nextBilling の前日まで（以後の請求なし）、過ぎていればもう1回請求して、その次の請求日の前日まで
export function cancelPlan(cycle, { requestDate, nextBilling, anchorDay }) {
  const cutoff = cancelCutoffFor(cycle, nextBilling);
  if (requestDate <= cutoff) {
    return { inTime: true, cutoff, endBoundary: nextBilling, lastDay: addDays(nextBilling, -1), extraCharge: null };
  }
  const after = nextBillingAfter(nextBilling, anchorDay || parts(nextBilling)[2]);
  return { inTime: false, cutoff, endBoundary: after, lastDay: addDays(after, -1), extraCharge: nextBilling };
}

// 会員の次の請求日（DB に保存した請求の基準から求める。Stripe を呼ばずに表示に使う）
export function nextBillingDate({ firstFullDate, anchorDay }, today = jstToday()) {
  if (!firstFullDate) return null;
  let d = firstFullDate;
  for (let i = 0; i < 600 && d <= today; i++) d = nextBillingAfter(d, anchorDay);
  return d;
}

export function describeCycle(cycle) {
  const c = normalizeCycle(cycle);
  const bill = c.billing_mode === 'fixed_day' ? `毎月${c.billing_day === 31 ? '末日' : `${c.billing_day}日`}に請求` : '入会日と同じ日に毎月請求';
  const first = { prorate: '初月は日割り', full: '初月も1か月分', free: '初月は無料' }[c.first_month];
  const cut = c.billing_mode === 'fixed_day' ? `退会は毎月${c.cancel_cutoff_day === 31 ? '末日' : `${c.cancel_cutoff_day}日`}締め` : `退会は請求日の${c.cancel_cutoff_days_before}日前まで`;
  return `${bill}・${first}・${cut}`;
}
