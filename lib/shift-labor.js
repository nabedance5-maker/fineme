// スタッフ別の労働条件（雇用形態・勤務上限・休日確保）と労基法ベースの法定下限の判定。
// 自動作成（lib/shift-generator.js）と確定前チェック（labor-check API）の両方で使う。
// 週は月曜始まり、月は暦月で数える。業務委託は労基法の対象外のため、法定の既定上限は
// 付けず、店舗が設定した上限だけを適用する。

export const EMPLOYMENT_TYPES = {
  fulltime: '正社員',
  parttime: 'パート',
  arbeit: 'アルバイト',
  contractor: '業務委託',
  other: 'その他',
};

export const LEGAL_DEFAULTS = {
  max_hours_per_day: 8,
  max_hours_per_week: 40,
  min_days_off_per_week: 1,
  max_consecutive_days: 6,
};

const num = v => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

export function effectiveLimits(cond) {
  const employee = (cond?.employment_type || 'fulltime') !== 'contractor';
  const pick = (v, d) => num(v) ?? (employee ? d : null);
  const minOff = pick(cond?.min_days_off_per_week, LEGAL_DEFAULTS.min_days_off_per_week);
  const explicitDaysWeek = num(cond?.max_days_per_week);
  const offCap = minOff === null ? null : 7 - minOff;
  const daysWeek = [explicitDaysWeek, offCap].filter(v => v !== null);
  return {
    hoursDay: pick(cond?.max_hours_per_day, LEGAL_DEFAULTS.max_hours_per_day),
    hoursWeek: pick(cond?.max_hours_per_week, LEGAL_DEFAULTS.max_hours_per_week),
    hoursMonth: num(cond?.max_hours_per_month),
    daysWeek: daysWeek.length ? Math.min(...daysWeek) : null,
    daysMonth: num(cond?.max_days_per_month),
    consecutive: pick(cond?.max_consecutive_days, LEGAL_DEFAULTS.max_consecutive_days),
  };
}

export function toMinutes(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

export function durationHours(start, end) {
  const s = toMinutes(start), e = toMinutes(end);
  if (s === null || e === null) return 0;
  const diff = e > s ? e - s : e + 24 * 60 - s;
  return diff / 60;
}

// 実働時間＝拘束時間から法定の最低休憩（6時間超45分・8時間超60分）を引いた時間。
// シフトは「9:00〜18:00」のように休憩込みで入力されるため、上限の判定は実働で行う。
export function workingHours(start, end) {
  const h = durationHours(start, end);
  return h - (h > 8 ? 1 : h > 6 ? 0.75 : 0);
}

function dayNum(date) { return Math.floor(new Date(date + 'T00:00:00Z').getTime() / 86400000); }
function numToDate(n) { return new Date(n * 86400000).toISOString().slice(0, 10); }
export function weekKey(date) {
  const n = dayNum(date);
  const wd = (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7; // 月=0
  return numToDate(n - wd);
}
const monthKey = date => date.slice(0, 7);
const round1 = v => Math.round(v * 10) / 10;

// 追加しても上限を超えないかを1コマずつ判定しながら積み上げる（自動作成用）
export function createLoadTracker(limitsByStaff) {
  const day = {}, weekH = {}, weekD = {}, monthH = {}, monthD = {}, workDays = {};
  const get = (obj, k) => (obj[k] = obj[k] || {});
  const limitsOf = id => limitsByStaff[id] || effectiveLimits(null);

  function consecutiveWith(staffId, date) {
    const set = workDays[staffId] || new Set();
    const n = dayNum(date);
    let run = 1;
    for (let i = n - 1; set.has(numToDate(i)); i--) run++;
    for (let i = n + 1; set.has(numToDate(i)); i++) run++;
    return run;
  }

  function check(staffId, date, hours) {
    const lim = limitsOf(staffId);
    const dh = (get(day, staffId)[date] || 0) + hours;
    if (lim.hoursDay !== null && dh > lim.hoursDay + 1e-9) return `1日${lim.hoursDay}時間の上限超過`;
    const wk = weekKey(date), mk = monthKey(date);
    const wh = (get(weekH, staffId)[wk] || 0) + hours;
    if (lim.hoursWeek !== null && wh > lim.hoursWeek + 1e-9) return `週${lim.hoursWeek}時間の上限超過`;
    const mh = (get(monthH, staffId)[mk] || 0) + hours;
    if (lim.hoursMonth !== null && mh > lim.hoursMonth + 1e-9) return `月${lim.hoursMonth}時間の上限超過`;
    const isNewDay = !workDays[staffId]?.has(date);
    if (isNewDay) {
      const wd = (weekD[staffId]?.[wk]?.size || 0) + 1;
      if (lim.daysWeek !== null && wd > lim.daysWeek) return `週${lim.daysWeek}日までの勤務日数（休日確保）を超過`;
      const md = (monthD[staffId]?.[mk]?.size || 0) + 1;
      if (lim.daysMonth !== null && md > lim.daysMonth) return `月${lim.daysMonth}日の上限超過`;
      if (lim.consecutive !== null && consecutiveWith(staffId, date) > lim.consecutive) return `連続${lim.consecutive}日勤務の上限超過`;
    }
    return null;
  }

  function add(staffId, date, hours) {
    const wk = weekKey(date), mk = monthKey(date);
    get(day, staffId)[date] = (day[staffId][date] || 0) + hours;
    get(weekH, staffId)[wk] = (weekH[staffId][wk] || 0) + hours;
    get(monthH, staffId)[mk] = (monthH[staffId][mk] || 0) + hours;
    (get(weekD, staffId)[wk] = weekD[staffId][wk] || new Set()).add(date);
    (get(monthD, staffId)[mk] = monthD[staffId][mk] || new Set()).add(date);
    (workDays[staffId] = workDays[staffId] || new Set()).add(date);
  }

  return { check, add, hoursSoFar: id => Object.values(day[id] || {}).reduce((a, b) => a + b, 0) };
}

// 確定済み・手動分も含めた全コマを走査して違反を洗い出す（確定前チェック用）
export function evaluateLabor(entries, limitsByStaff, nameOf = id => id) {
  const byStaff = {};
  entries.forEach(e => { (byStaff[e.staff_id] = byStaff[e.staff_id] || []).push(e); });
  const violations = [];
  const stats = {};
  Object.entries(byStaff).forEach(([staffId, list]) => {
    const lim = limitsByStaff[staffId] || effectiveLimits(null);
    const name = nameOf(staffId);
    const dayH = {}, weekH = {}, weekDays = {}, monthH = {}, monthDays = {};
    list.forEach(e => {
      const h = workingHours(e.start_time, e.end_time);
      dayH[e.date] = (dayH[e.date] || 0) + h;
      const wk = weekKey(e.date), mk = monthKey(e.date);
      weekH[wk] = (weekH[wk] || 0) + h;
      monthH[mk] = (monthH[mk] || 0) + h;
      (weekDays[wk] = weekDays[wk] || new Set()).add(e.date);
      (monthDays[mk] = monthDays[mk] || new Set()).add(e.date);
    });
    const push = (kind, message, dates) => violations.push({ staff_id: staffId, kind, message: `${name}：${message}`, dates });
    Object.entries(dayH).forEach(([d, h]) => {
      if (lim.hoursDay !== null && h > lim.hoursDay + 1e-9) push('day_hours', `${d} が${round1(h)}時間（1日の上限${lim.hoursDay}時間）`, [d]);
    });
    Object.entries(weekH).forEach(([wk, h]) => {
      const dates = [...weekDays[wk]].sort();
      if (lim.hoursWeek !== null && h > lim.hoursWeek + 1e-9) push('week_hours', `${wk}の週が${round1(h)}時間（週の上限${lim.hoursWeek}時間）`, dates);
      if (lim.daysWeek !== null && dates.length > lim.daysWeek) push('week_days', `${wk}の週が${dates.length}日勤務（週${lim.daysWeek}日まで。休日が足りません）`, dates);
    });
    Object.entries(monthH).forEach(([mk, h]) => {
      const dates = [...monthDays[mk]].sort();
      if (lim.hoursMonth !== null && h > lim.hoursMonth + 1e-9) push('month_hours', `${mk}が${round1(h)}時間（月の上限${lim.hoursMonth}時間）`, dates);
      if (lim.daysMonth !== null && dates.length > lim.daysMonth) push('month_days', `${mk}が${dates.length}日勤務（月${lim.daysMonth}日まで）`, dates);
    });
    if (lim.consecutive !== null) {
      const sorted = Object.keys(dayH).sort();
      let run = [];
      const flush = () => { if (run.length > lim.consecutive) push('consecutive', `${run[0]}〜${run[run.length - 1]}が${run.length}日連続勤務（上限${lim.consecutive}日）`, [...run]); run = []; };
      sorted.forEach(d => { if (run.length && dayNum(d) !== dayNum(run[run.length - 1]) + 1) flush(); run.push(d); });
      flush();
    }
    stats[staffId] = {
      days: Object.keys(dayH).length,
      hours: round1(Object.values(dayH).reduce((a, b) => a + b, 0)),
    };
  });
  return { violations, stats };
}
