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
import { effectiveLimits, weekKey } from './shift-labor.js';

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
 * チームを先に考え、個人はその中で考える（渡邉指摘 2026-10-30：1人のスタッフだけで考えるな。チームでも個人でもバランスを）。
 *  1. 曜日ごとに「店として何人いるべきか」を、過去8週のチーム全体の出勤人数から決める（履歴が無ければ均等）。
 *     その週に入れられる人数の合計に合わせて按分する。希望どおり入る人・もう入っているシフトは先に数える
 *  2. いちばん足りない日から1人ずつ埋める。その日に入れる人は、週の勤務日数がまだ残っている人の中から、
 *     その曜日によく入っている人（いつもの働き方）と週の残りが多い人（偏らせない）を合わせた点数で選ぶ
 *  3. 時間帯は、その日の人の少ない時間へ寄せる（lib/shift-generator.js）。長さはその人のいつもの長さ、
 *     同じくらいならいつもの開始時刻に近い方（pref_start）
 * @returns {{ windows: Array<{staff_id,date,start_time,end_time,pref_start?}>, notes: Array<{staff_id, reason}> }}
 */
export function buildHabitWindows({ dates, staff, conditions, pastEntries, businessHours, closedDates, offKeys, priorities, busyDates = [] }) {
  const bh = businessHours || {};
  const hasHours = Object.values(bh).some(h => h && !h.closed && h.open && h.close);
  const closed = new Set(closedDates || []);
  const isOpen = d => !closed.has(d) && (!hasHours || !isClosedWeekday(bh, d));
  const openDates = dates.filter(isOpen);
  const hoursOf = d => (hasHours ? bh[WEEKDAY_KEYS[wdOf(d)]] : { open: '09:00', close: '18:00' });
  const condOf = Object.fromEntries((conditions || []).map(c => [c.staff_id, c]));
  const prio = Object.fromEntries((priorities || []).map(p => [p.staff_id, p.priority_score || 0]));
  const habits = habitsOf(pastEntries);

  // チームの曜日ごとの出勤人数（過去8週）。営業していた日だけで平均する
  const teamByDate = {};
  (pastEntries || []).forEach(e => { (teamByDate[e.date] = teamByDate[e.date] || new Set()).add(e.staff_id); });
  const wdSum = Array(7).fill(0), wdCnt = Array(7).fill(0);
  if (pastEntries?.length) {
    const days = Object.keys(teamByDate).sort();
    const d = new Date(days[0] + 'T00:00:00Z'), last = days[days.length - 1];
    while (d.toISOString().slice(0, 10) <= last) {
      const ds = d.toISOString().slice(0, 10);
      if (isOpen(ds)) { wdSum[wdOf(ds)] += teamByDate[ds]?.size || 0; wdCnt[wdOf(ds)]++; }
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }
  const teamExpected = wd => (wdCnt[wd] ? wdSum[wd] / wdCnt[wd] : 1);

  // 1人ずつの週の勤務日数（いつもの働き方・労働条件）
  const notes = [];
  const people = [];
  for (const st of staff) {
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
    const total = habit ? habit.freq.reduce((a, b) => a + b, 0) || 1 : 1;
    people.push({ id: st.id, perWeek, affinity: wd => (habit ? habit.freq[wd] / total : 0), usual: wd => habit?.usual[wd] || null, prio: prio[st.id] || 0 });
  }

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
  const busy = {};
  busyDates.forEach(d => { busy[d] = (busy[d] || 0) + 1; });

  const windows = [];
  for (const [wk, days] of Object.entries(weeks)) {
    const quota = {}, initial = {};
    people.forEach(p => { quota[p.id] = initial[p.id] = Math.min(days.length, Math.round(p.perWeek * days.length / openDaysInFullWeek(wk))); });
    const coverage = Object.fromEntries(days.map(d => [d, busy[d] || 0]));
    // その週に入れられる人数（これから入れる分＋もう入っている分）を、チームの曜日ごとの人数の比で各日に配る
    const capacity = Object.values(quota).reduce((a, b) => a + b, 0) + days.reduce((a, d) => a + coverage[d], 0);
    const expSum = days.reduce((a, d) => a + teamExpected(wdOf(d)), 0) || 1;
    const target = Object.fromEntries(days.map(d => [d, teamExpected(wdOf(d)) * capacity / expSum]));
    const placed = new Set();
    for (;;) {
      const options = [];
      for (const d of days) {
        const who = people.filter(p => quota[p.id] > 0 && !placed.has(`${p.id}|${d}`) && !offKeys.has(`${p.id}|${d}`));
        if (who.length) options.push({ d, who });
      }
      if (!options.length) break;
      // いちばん足りない日（目安との差が大きい日）から
      options.sort((a, b) => (target[b.d] - coverage[b.d]) - (target[a.d] - coverage[a.d]) || coverage[a.d] - coverage[b.d] || (a.d < b.d ? -1 : 1));
      const { d, who } = options[0];
      const wd = wdOf(d);
      // その日に入れる人：その曜日によく入っている人（いつもの働き方）と、週の残りが多い人（偏らせない）を合わせて選ぶ。同点なら優先度
      const score = p => p.affinity(wd) + 0.5 * (quota[p.id] / (initial[p.id] || 1));
      who.sort((a, b) => score(b) - score(a) || b.prio - a.prio);
      const p = who[0];
      const h = hoursOf(d);
      const usual = p.usual(wd);
      // 時間帯はチームで決める：営業時間の中で人の少ない時間へ。長さ・開始の目安はその人のいつもの働き方
      windows.push({ staff_id: p.id, date: d, start_time: hm(h.open), end_time: hm(h.close), ...(usual ? { pref_start: usual.start } : {}) });
      placed.add(`${p.id}|${d}`);
      quota[p.id]--;
      coverage[d]++;
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
