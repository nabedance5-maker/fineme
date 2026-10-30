// 希望を出していないスタッフの「出勤できる日と時間帯」を、本人のいつもの働き方とチームのバランスから決める
// （渡邉要望 2026-10-30：希望が出ていなくても、条件や個人とチームのバランスを考えて自動で作れると最高）。
//
// 個人のバランス：過去8週のシフトから、週に何日・どの曜日・何時〜何時で働いているかを読み取り、それに沿う。
//   過去のシフトが無い人は、労働条件（雇用形態）を設定してある時だけ入れる。正社員なら営業時間内で法定の範囲（実際の長さ・上限は自動作成側で切る）、
//   パート・アルバイト・業務委託などは労働条件に上限（週の日数・週の時間）がある時だけ、その範囲で入れる。
//   どちらも無い人は入れずに理由を返す（本人が望まない長時間勤務を作らない）。
// チームのバランス：週ごとに、その時点で人が少ない日から順に割り振る（同じ日に人が固まらない）。
// ここで返すのは「この日のこの時間帯なら入れてよい」範囲。実際の時間・上限の判定は lib/shift-generator.js が行う。
import { isClosedWeekday } from './closed-weekday.js';
import { effectiveLimits, workingHours, weekKey } from './shift-labor.js';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const HISTORY_WEEKS = 8;
const hm = t => String(t || '').slice(0, 5);
const wdOf = date => new Date(date + 'T00:00:00Z').getUTCDay();

export function historyRange(from) {
  const d = new Date(from + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  const to = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() - (HISTORY_WEEKS * 7 - 1));
  return { from: d.toISOString().slice(0, 10), to };
}

// 過去のシフトから、1人ずつの「いつもの働き方」を読む
function habitsOf(pastEntries) {
  const by = {};
  (pastEntries || []).forEach(e => { (by[e.staff_id] = by[e.staff_id] || []).push(e); });
  const out = {};
  Object.entries(by).forEach(([staffId, list]) => {
    const dates = [...new Set(list.map(e => e.date))].sort();
    const weeks = Math.min(HISTORY_WEEKS, Math.max(1, new Set(dates.map(weekKey)).size));
    const freq = Array(7).fill(0);
    const times = {};
    dates.forEach(d => { freq[wdOf(d)]++; });
    list.forEach(e => {
      const k = `${hm(e.start_time)}-${hm(e.end_time)}`;
      const t = (times[wdOf(e.date)] = times[wdOf(e.date)] || {});
      t[k] = (t[k] || 0) + 1;
    });
    const usual = {};
    Object.entries(times).forEach(([wd, counts]) => {
      const [best] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const [s, e] = best[0].split('-');
      usual[wd] = { start: s, end: e };
    });
    out[staffId] = { daysPerWeek: dates.length / weeks, freq, usual };
  });
  return out;
}

/**
 * @returns {{ windows: Array<{staff_id,date,start_time,end_time}>, notes: Array<{staff_id, reason}> }}
 */
export function buildHabitWindows({ dates, staff, conditions, pastEntries, businessHours, closedDates, offKeys, priorities, busyDates = [] }) {
  const bh = businessHours || {};
  const hasHours = Object.values(bh).some(h => h && !h.closed && h.open && h.close);
  const closed = new Set(closedDates || []);
  const openDates = dates.filter(d => !closed.has(d) && (!hasHours || !isClosedWeekday(bh, d)));
  const hoursOf = d => (hasHours ? bh[WEEKDAY_KEYS[wdOf(d)]] : { open: '09:00', close: '18:00' });
  const condOf = Object.fromEntries((conditions || []).map(c => [c.staff_id, c]));
  const prio = Object.fromEntries((priorities || []).map(p => [p.staff_id, p.priority_score || 0]));
  const habits = habitsOf(pastEntries);

  // 週ごとの営業日（範囲の外の日も数えて、月の端の週は日数を按分する）
  const weeks = {};
  openDates.forEach(d => { (weeks[weekKey(d)] = weeks[weekKey(d)] || []).push(d); });
  const openDaysInFullWeek = wk => {
    const start = new Date(wk + 'T00:00:00Z');
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setUTCDate(start.getUTCDate() + i);
      if (!hasHours || !isClosedWeekday(bh, d.toISOString().slice(0, 10))) n++;
    }
    return Math.max(1, n);
  };

  const coverage = {}; // date -> 人数（チームのバランス用）。希望どおり入る人・もう入っているシフトも数える
  busyDates.forEach(d => { coverage[d] = (coverage[d] || 0) + 1; });
  const windows = [], notes = [];
  // 優先度の高い人から（店長・社員を先に、いつもの曜日に置く）
  const order = [...staff].sort((a, b) => (prio[b.id] || 0) - (prio[a.id] || 0));
  for (const st of order) {
    const cond = condOf[st.id];
    const type = cond?.employment_type || 'fulltime';
    const lim = effectiveLimits(cond);
    const habit = habits[st.id];
    let perWeek;
    if (habit) perWeek = habit.daysPerWeek;
    else if (!cond) {
      // 紹介用に登録しただけのスタッフ等に、勝手に毎日のシフトを作らない
      notes.push({ staff_id: st.id, reason: '希望も過去のシフトも無く、労働条件（雇用形態）も未設定のため入れていません' });
      continue;
    } else if (type === 'fulltime') {
      const dayH = lim.hoursDay || 8;
      perWeek = Math.min(lim.daysWeek ?? 5, lim.hoursWeek ? Math.floor(lim.hoursWeek / dayH) : 5);
    } else if (cond?.max_days_per_week || cond?.max_hours_per_week) {
      const byDays = Number(cond.max_days_per_week) || 7;
      const byHours = cond.max_hours_per_week ? Math.max(1, Math.floor(Number(cond.max_hours_per_week) / Math.min(lim.hoursDay || 8, 8))) : 7;
      perWeek = Math.min(byDays, byHours);
    } else {
      notes.push({ staff_id: st.id, reason: '希望も過去のシフトも無く、労働条件に上限（週の日数・時間）も無いため入れていません' });
      continue;
    }
    if (lim.daysWeek !== null) perWeek = Math.min(perWeek, lim.daysWeek);

    for (const [wk, days] of Object.entries(weeks)) {
      const target = Math.round(perWeek * days.length / openDaysInFullWeek(wk));
      if (target <= 0) continue;
      const candidates = days.filter(d => !offKeys.has(`${st.id}|${d}`));
      // いつも働く曜日を先に、同じくらいなら人が少ない日から（チームのバランス）
      candidates.sort((a, b) => ((habit?.freq[wdOf(b)] || 0) - (habit?.freq[wdOf(a)] || 0)) || ((coverage[a] || 0) - (coverage[b] || 0)) || (a < b ? -1 : 1));
      for (const d of candidates.slice(0, target)) {
        const h = hoursOf(d);
        const usual = habit?.usual[wdOf(d)];
        // いつもの時間があればそれを、無ければ営業時間（長さは自動作成側で法定の範囲に切り、人の少ない時間帯へ寄せる）
        const win = usual && workingHours(usual.start, usual.end) > 0 ? { start_time: usual.start, end_time: usual.end } : { start_time: hm(h.open), end_time: hm(h.close) };
        windows.push({ staff_id: st.id, date: d, ...win });
        coverage[d] = (coverage[d] || 0) + 1;
      }
    }
  }
  return { windows, notes };
}

// スタッフごとのいつもの1回の長さ（拘束・分）。過去8週のシフトの中央値
export function usualMinutesOf(pastEntries) {
  const by = {};
  (pastEntries || []).forEach(e => {
    const [sh, sm] = String(e.start_time).split(':').map(Number), [eh, em] = String(e.end_time).split(':').map(Number);
    let m = (eh * 60 + em) - (sh * 60 + sm);
    if (m <= 0) m += 1440;
    (by[e.staff_id] = by[e.staff_id] || []).push(m);
  });
  return Object.fromEntries(Object.entries(by).map(([id, list]) => {
    const v = list.sort((a, b) => a - b);
    return [id, v[Math.floor(v.length / 2)]];
  }));
}
