// 月会費の請求日・請求する月・初月の扱い・退会の締め日（でお指摘 2026-10-27）。
// お店ごとに事情が違う（11月分を10月中に前払いでもらう店、11月分を12月の頭に後払いでもらう店がある）ため、
// 「◯月分を、前の月／その月／次の月の◯日に請求する」をお店で決める。
//
// 店舗の設定（provider_membership_settings）
//   billing_mode         : 'fixed_day'（月ごとの会費を、決まった日に請求）| 'anniversary'（入会日から1か月ごと。前払い）
//   billing_day          : 1〜28（fixed_day のとき。Stripe は請求日を世界標準時の日付で数えるため、末日は扱わない）
//   billing_month_offset : -1＝前の月（前払い）、0＝その月、1＝次の月（後払い）
//   first_month          : 入会した月（入会日〜月末）の会費 'prorate'（日割り）| 'full'（1か月分）| 'free'（無料）
//   cancel_cutoff_day    : fixed_day のとき「毎月◯日締め」。締め日までの退会申請はその月分まで、過ぎたら翌月分まで
//   cancel_cutoff_days_before : anniversary のとき「次の請求日の◯日前まで」
//
// 月会費の「◯月分」はカレンダーの月（1日〜末日）。日付はすべて日本時間の YYYY-MM-DD。
// Stripe での請求はその日の朝9時（日本時間）＝世界標準時の0時。Stripe は毎月の請求日を世界標準時の日付で数えるため、日本時間の0時にすると1日ずれる。
// 承認した日までに請求日が来ている月の分は、承認した時にまとめて請求する（入会金も承認時）。

export const BILLING_MODES = { fixed_day: '月ごとの会費を、決まった日に請求', anniversary: '入会日から1か月ごとに請求（前払い）' };
export const MONTH_OFFSETS = { '-1': '前の月', '0': 'その月', '1': '次の月' };
export const FIRST_MONTH = { prorate: '日割りで請求', full: '1か月分を請求', free: '無料' };
export const DEFAULT_CYCLE = { billing_mode: 'fixed_day', billing_day: 1, billing_month_offset: 0, first_month: 'prorate', cancel_cutoff_day: 20, cancel_cutoff_days_before: 10 };

const pad = n => String(n).padStart(2, '0');
const lastDay = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1〜12
const parts = s => s.split('-').map(Number);
const make = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
export const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
export const addDays = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const jstToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
export const jstTs = date => Math.floor(Date.parse(`${date}T00:00:00+09:00`) / 1000);
// Stripe に渡す請求・解約の時刻（その日の9:00 日本時間＝0:00 世界標準時）
export const stripeTs = date => Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000);
export const tsToJst = ts => (ts ? new Date(ts * 1000 + 9 * 3600000).toISOString().slice(0, 10) : null);
const md = s => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
export const dayLabel = d => (d === 31 ? '末日' : `${d}日`);

// 月の足し引き（ym は 'YYYY-MM'）
export function addMonth(ym, n) { const [y, m] = parts(ym); const t = y * 12 + (m - 1) + n; return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`; }
const ymOf = date => date.slice(0, 7);
const monthLabel = ym => `${Number(ym.slice(5, 7))}月分`;
// その月の「◯日」（31＝末日。短い月は末日に寄せる）
function dayIn(ym, day) { const [y, m] = parts(ym); return make(y, m, Math.min(day, lastDay(y, m))); }

export function normalizeCycle(s) {
  const c = s || {};
  const day = Math.floor(Number(c.billing_day));
  const cut = Math.floor(Number(c.cancel_cutoff_day));
  const before = Math.floor(Number(c.cancel_cutoff_days_before));
  const off = Number(c.billing_month_offset);
  let first = FIRST_MONTH[c.first_month] ? c.first_month : null;
  if (!first) first = c.prorate_first_month === false ? 'full' : DEFAULT_CYCLE.first_month; // 以前の設定からの引き継ぎ
  return {
    billing_mode: BILLING_MODES[c.billing_mode] ? c.billing_mode : DEFAULT_CYCLE.billing_mode,
    billing_day: day >= 1 && day <= 28 ? day : day > 28 ? 28 : DEFAULT_CYCLE.billing_day,
    billing_month_offset: [-1, 0, 1].includes(off) ? off : DEFAULT_CYCLE.billing_month_offset,
    first_month: first,
    cancel_cutoff_day: (cut >= 1 && cut <= 28) || cut === 31 ? cut : DEFAULT_CYCLE.cancel_cutoff_day,
    cancel_cutoff_days_before: before >= 0 && before <= 27 ? before : DEFAULT_CYCLE.cancel_cutoff_days_before,
  };
}

// 設定の矛盾チェック。前払い（前の月に請求）では、締め日が請求日より後だと「締め日までに申し込んだのに翌月分を請求済み」になる
export function cycleError(cycle) {
  const c = normalizeCycle(cycle);
  if (c.billing_mode === 'fixed_day' && c.billing_month_offset === -1 && c.cancel_cutoff_day >= c.billing_day) {
    return `前の月に請求する場合、退会の締め日（${dayLabel(c.cancel_cutoff_day)}）は請求日（${dayLabel(c.billing_day)}）より前の日にしてください`;
  }
  return null;
}

// ◯月分の請求日
export function dueOf(cycle, ym) {
  const c = normalizeCycle(cycle);
  return dayIn(addMonth(ym, c.billing_month_offset), c.billing_day);
}

// 入会日 startDate からの請求の予定。today（承認する日）までに請求日が来ている分は「承認時にまとめて」（immediate）。
//   months    : 入会した月から、定期の請求が始まる月の次の月まで [{ ym, label, from, to, days, periodDays, kind, amount, due, immediate }]
//   scheduled : 定期の請求（Stripe のサブスク）が最初に請求する月。kind==='partial' なら、その請求は1か月分から adjust を引く
export function billingSchedule(cycle, { startDate, monthlyTotal = 0, today = jstToday() }) {
  const c = normalizeCycle(cycle);
  const months = [];
  if (c.billing_mode === 'anniversary') {
    // 入会日から1か月ごと、各期間の初日に前払い
    const day = parts(startDate)[2];
    let from = startDate;
    for (let i = 0; i < 3; i++) {
      const next = dayIn(addMonth(ymOf(from), 1), day);
      months.push({ ym: null, label: `${md(from)}〜${md(addDays(next, -1))}分`, from, to: addDays(next, -1), kind: 'full', amount: monthlyTotal, due: from, immediate: from <= today });
      from = next;
      if (!months[months.length - 1].immediate && months.filter(x => !x.immediate).length >= 2) break;
    }
    const scheduled = months.find(x => !x.immediate);
    return { cycle: c, anchorDay: day, start: startDate, months, scheduled, adjust: 0, partial: null };
  }

  const startYm = ymOf(startDate);
  const partialFirst = parts(startDate)[2] !== 1;
  let ym = startYm;
  for (let i = 0; i < 6; i++) {
    const [y, m] = parts(ym);
    const periodDays = lastDay(y, m);
    const isFirst = ym === startYm;
    const from = isFirst ? startDate : `${ym}-01`;
    const to = make(y, m, periodDays);
    const days = daysBetween(from, to) + 1;
    let kind = 'full';
    let amount = monthlyTotal;
    if (isFirst && partialFirst) {
      kind = 'partial';
      amount = c.first_month === 'prorate' ? Math.round(monthlyTotal * days / periodDays) : c.first_month === 'full' ? monthlyTotal : 0;
    }
    const due = dueOf(c, ym);
    months.push({ ym, label: monthLabel(ym), from, to, days, periodDays, kind, amount, due, immediate: due <= today });
    // 定期の請求が始まる月と、その次の月（1か月分）まで並べる
    const sched = months.filter(x => !x.immediate);
    if (sched.length >= 2 || (sched.length === 1 && sched[0].kind === 'full' && months.length >= 2 && sched[0] !== months[0])) break;
    ym = addMonth(ym, 1);
  }
  const scheduled = months.find(x => !x.immediate);
  const adjust = scheduled && scheduled.kind === 'partial' ? monthlyTotal - scheduled.amount : 0;
  const pm = months[0].kind === 'partial' ? months[0] : null;
  return { cycle: c, anchorDay: c.billing_day, start: startDate, months, scheduled, adjust, partial: pm ? { from: pm.from, to: pm.to, days: pm.days, periodDays: pm.periodDays, amount: pm.amount } : null };
}

// Stripe のサブスクの始め方。定期の請求が最初に請求する日（scheduled.due）を billing_cycle_anchor にして、
// それまでは請求しない（proration none だと、その日まで請求書を作らない）。trial は使わない
// （trial だと作成時に0円の請求書ができ、「1回だけ」のクーポンがそこで使われてしまうため）。
export function stripeStart(cycle, { startDate, monthlyTotal = 0, today = jstToday() }) {
  const s = billingSchedule(cycle, { startDate, monthlyTotal, today });
  const params = { billing_cycle_anchor: stripeTs(s.scheduled.due), proration_behavior: 'none' };
  return { params, schedule: s, immediate: s.months.filter(x => x.immediate && x.amount > 0), adjust: s.adjust };
}

// 「◯か月」のクーポンを、サブスクの最初の請求から n 回分に効かせるための duration_in_months。
// Stripe はクーポンを付けた時から◯か月の間の請求書に割引するため、最初の請求まで間が空く分を足す
export function couponMonthsFor({ today = jstToday(), firstDue, anchorDay, n }) {
  let last = firstDue;
  for (let i = 1; i < n; i++) last = dayIn(addMonth(ymOf(last), 1), anchorDay);
  let k = 1;
  while (k < 120 && dayIn(addMonth(ymOf(today), k), parts(today)[2]) <= last) k++;
  return k;
}

// 会員ごとの請求の基準（承認時に DB に保存したもの）から、次回の請求
export function nextCharge(member, today = jstToday()) {
  if (!member?.billing_start_date) return null;
  const cyc = memberCycle(member);
  if (cyc.billing_mode === 'anniversary') {
    let from = member.billing_start_date;
    const day = parts(from)[2];
    for (let i = 0; i < 600 && from <= today; i++) from = dayIn(addMonth(ymOf(from), 1), day);
    return { date: from, label: `${md(from)}〜分` };
  }
  let ym = ymOf(member.billing_start_date);
  for (let i = 0; i < 600 && dueOf(cyc, ym) <= today; i++) ym = addMonth(ym, 1);
  return { date: dueOf(cyc, ym), label: monthLabel(ym), ym };
}

// DB の会員の行 → 請求の設定（承認時の内容。お店があとで設定を変えても、その会員は変わらない）
export function memberCycle(m) {
  return normalizeCycle({ billing_mode: m?.billing_mode, billing_day: m?.billing_anchor_day, billing_month_offset: m?.billing_month_offset, cancel_cutoff_day: m?.cancel_cutoff_day, cancel_cutoff_days_before: m?.cancel_cutoff_days_before });
}

// 退会の申し込み日 requestDate から、いつまでの会費を払って退会になるか。
// cycle は店舗の今の設定（締め日）と会員の請求の基準を合わせたもの。nextBilling は Stripe の次の請求日（入会日基準のときだけ使う）
//   lastMonth  : 最後に払う月（fixed_day）
//   lastDay    : 会員として通える最後の日
//   endDate    : 退会日（lastDay の翌日）
//   lastCharge : 最後の請求日（今後の請求がもう無ければ null）
//   stripeEnd  : Stripe のサブスクを終える日（この日の請求をしない）
export function cancelPlan(cycle, { requestDate, nextBilling, startDate }) {
  const c = normalizeCycle(cycle);
  if (c.billing_mode === 'anniversary') {
    const cutoff = addDays(nextBilling, -c.cancel_cutoff_days_before);
    const inTime = requestDate <= cutoff;
    const day = parts(startDate || nextBilling)[2];
    const end = inTime ? nextBilling : dayIn(addMonth(ymOf(nextBilling), 1), day);
    return { inTime, cutoff, lastDay: addDays(end, -1), endDate: end, lastCharge: inTime ? null : nextBilling, stripeEnd: end };
  }
  const X = ymOf(requestDate);
  const cutoff = dayIn(X, c.cancel_cutoff_day);
  const inTime = requestDate <= cutoff;
  let lastMonth = inTime ? X : addMonth(X, 1);
  // 入会した月より前は無い
  if (startDate && lastMonth < ymOf(startDate)) lastMonth = addMonth(ymOf(startDate), -1);
  const [y, m] = parts(lastMonth);
  const lastDayOfMember = make(y, m, lastDay(y, m));
  const lastDue = dueOf(c, lastMonth);
  return {
    inTime, cutoff, lastMonth, lastMonthLabel: monthLabel(lastMonth),
    lastDay: lastDayOfMember, endDate: addDays(lastDayOfMember, 1),
    lastCharge: lastDue > requestDate ? lastDue : null, lastChargeLabel: monthLabel(lastMonth),
    stripeEnd: dueOf(c, addMonth(lastMonth, 1)),
  };
}

export function describeCycle(cycle) {
  const c = normalizeCycle(cycle);
  if (c.billing_mode === 'anniversary') return `入会日から1か月ごとに前払いで請求・退会は請求日の${c.cancel_cutoff_days_before}日前まで`;
  const when = `${MONTH_OFFSETS[String(c.billing_month_offset)]}の${dayLabel(c.billing_day)}`;
  const ex = '2026-11';
  const first = { prorate: '入会した月は日割り', full: '入会した月も1か月分', free: '入会した月は無料' }[c.first_month];
  return `◯月分を${when}に請求（例：11月分は${md(dueOf(c, ex))}）・${first}・退会は毎月${dayLabel(c.cancel_cutoff_day)}締め`;
}
