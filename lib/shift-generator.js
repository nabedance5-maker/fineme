// シフト自動作成のルールベースアルゴリズム（Phase 1・でお要望2026-09-13〜14）。
// 「微妙な調整は結局人間の判断が要る」前提のため、最適化ソルバーのような高度な
// アルゴリズムは狙わない。店舗が選んだルールに沿って機械的に埋め、人員が
// 足りない枠は無理に埋めず「未充足」として報告する——最終調整は店舗側が手動で行う。
//
// rule_type:
//  - 'as_requested'：出勤希望をそのまま全部シフトに入れる（休み希望と衝突する日は除外）
//  - 'staffing_target'：日付ごとに割り当てられたパターン（時間帯×必要人数のセット）に
//    沿って埋める。パターンは店舗が事前にいくつか定義し、期間内の各日付に一括で
//    割り当てておく（でお要望2026-09-14：曜日固定ではなく、パターンを日付にまとめて
//    割り当てられるように）。その枠を希望時間帯がカバーしているスタッフの中から、
//    優先度ポイントが高い順に必要人数まで採用する。希望者が足りない枠はそのまま
//    「未充足」として返す。
//    優先度は「人員不足の穴埋め」専用ではなく、店長・社員を優先的に配置する等、
//    店舗の人員配置方針をそのまま反映する（でお指摘2026-09-14）——必要人数に対して
//    希望者が多い枠では常にこの順で採用されるため、恒常的な配置バランスの調整に使える。

import { createLoadTracker, effectiveLimits, toMinutes, workingHours } from './shift-labor.js';

// 労働条件（lib/shift-labor.js）：雇用形態ごとの勤務上限・休日確保を満たさない配置は
// 採用せず、skipped として理由付きで返す（2026-10-02 でお指摘「労基違反を生み出す」対策）。
//
// availability：休み希望だけを提出したスタッフの「出勤できる日と時間帯の範囲」（希望ではない）。
// 出勤希望を出した人を優先し、足りない分・空いている日に、労働条件の範囲内でだけ配置する
// （でお指摘2026-10-07：休み以外の日を営業時間いっぱいの出勤希望とみなすのは労基違反のもと）。

// 範囲（start〜end）に収まり、1日の実働上限（休憩込み）を超えない最長の拘束時間（分）
function fitLength(start, end, maxWorkHours) {
  const s = toMinutes(start), e = toMinutes(end);
  if (s === null || e === null || e <= s) return null;
  let len = e - s;
  if (maxWorkHours !== null && maxWorkHours !== undefined) {
    while (len > 0 && workingHours('00:00', fmt(len)) > maxWorkHours + 1e-9) len -= 15;
  }
  return len >= 60 ? len : null;
}
function fmt(min) { return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; }

function datesInRange(start, end) {
  const dates = [];
  const cur = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

/**
 * @param {object} params
 * @param {{period_start:string, period_end:string}} params.period
 * @param {Array<{staff_id:string, date:string, type:'work'|'off', start_time?:string, end_time?:string}>} params.requests
 * @param {string} params.ruleType 'as_requested' | 'staffing_target'
 * @param {Record<string,string>} params.dayPatterns 日付(YYYY-MM-DD) → pattern_id
 * @param {Record<string,{slots:Array<{start:string,end:string,required:number}>}>} params.patternsById pattern_id → パターン
 * @param {Array<{staff_id:string, priority_score:number}>} params.priorities
 * @param {Array<object>} params.conditions provider_shift_staff_conditions の行
 * @param {Array<{staff_id:string,date:string,start_time:string,end_time:string}>} params.existingEntries 既存の手動・他期間のコマ（上限の積み上げに含める）
 * @param {Array<{staff_id:string,date:string,start_time:string,end_time:string}>} params.availability 休み希望のみのスタッフが出勤できる日と時間帯の範囲
 * @returns {{entries: Array<{staff_id:string, date:string, start_time:string, end_time:string}>, skipped: Array<{staff_id:string,date:string,start_time:string,end_time:string,reason:string}>, warnings: Array<{date:string, start_time:string, end_time:string, required:number, filled:number}>}}
 */
export function generateShift({ period, requests, ruleType, dayPatterns, patternsById, priorities, conditions, existingEntries, availability }) {
  const priorityMap = {};
  (priorities || []).forEach(p => { priorityMap[p.staff_id] = p.priority_score || 0; });

  const limitsByStaff = {};
  (conditions || []).forEach(c => { limitsByStaff[c.staff_id] = effectiveLimits(c); });
  const tracker = createLoadTracker(limitsByStaff);
  const assigned = {}; // `${staff}|${date}` -> [{s,e}]
  const remember = (staffId, date, start, end) => {
    tracker.add(staffId, date, workingHours(start, end));
    (assigned[`${staffId}|${date}`] = assigned[`${staffId}|${date}`] || []).push({ s: toMinutes(start), e: toMinutes(end) });
  };
  (existingEntries || []).forEach(e => remember(e.staff_id, e.date, e.start_time, e.end_time));
  const overlapsAssigned = (staffId, date, s, e) => (assigned[`${staffId}|${date}`] || []).some(a => a.s < e && a.e > s);
  const skipped = [];

  const offSet = new Set();
  const workRequests = [];
  (requests || []).forEach(r => {
    if (r.type === 'off') offSet.add(`${r.staff_id}|${r.date}`);
  });
  (requests || []).forEach(r => {
    if (r.type === 'work' && !offSet.has(`${r.staff_id}|${r.date}`)) {
      workRequests.push(r);
    }
  });

  if (ruleType === 'staffing_target') {
    const entries = [];
    const warnings = [];
    datesInRange(period.period_start, period.period_end).forEach(date => {
      const patternId = (dayPatterns || {})[date];
      const pattern = patternId ? (patternsById || {})[patternId] : null;
      const slots = pattern?.slots || [];
      slots.forEach(slot => {
        const slotStart = toMinutes(slot.start);
        const slotEnd = toMinutes(slot.end);
        const required = Number(slot.required) || 0;
        if (!required) return;

        // その日・その枠に重なる出勤希望を出しているスタッフと、枠の時間帯がまるごと出勤できる範囲に
        // 収まる（休み希望のみの）スタッフを候補にする
        const candidates = [
          // 枠の時間が、本人が出した時間帯の中にまるごと収まる人だけ（希望外の時間には入れない）
          ...workRequests.filter(r => {
            if (r.date !== date) return false;
            const rs = toMinutes(r.start_time), re = toMinutes(r.end_time);
            return rs !== null && re !== null && rs <= slotStart && re >= slotEnd;
          }).map(r => ({ ...r, requested: true })),
          ...(availability || []).filter(a => a.date === date && toMinutes(a.start_time) <= slotStart && toMinutes(a.end_time) >= slotEnd)
            .map(a => ({ ...a, requested: false })),
        ];
        // 優先度ポイントの高い順（店長・社員など、必ず現場にいてほしい人を高くする運用）
        // 同点なら出勤希望を出した人を先に、さらに同じならここまでの勤務時間が少ない人を先に（偏りを減らす）
        candidates.sort((a, b) => (priorityMap[b.staff_id] || 0) - (priorityMap[a.staff_id] || 0) || (b.requested - a.requested) || tracker.hoursSoFar(a.staff_id) - tracker.hoursSoFar(b.staff_id));

        const hours = workingHours(slot.start, slot.end);
        let filled = 0;
        const seen = new Set();
        for (const r of candidates) {
          if (filled >= required) break;
          if (seen.has(r.staff_id) || overlapsAssigned(r.staff_id, date, slotStart, slotEnd)) continue;
          seen.add(r.staff_id);
          const reason = tracker.check(r.staff_id, date, hours);
          if (reason) { if (r.requested) skipped.push({ staff_id: r.staff_id, date, start_time: slot.start, end_time: slot.end, reason }); continue; }
          entries.push({ staff_id: r.staff_id, date, start_time: slot.start, end_time: slot.end });
          remember(r.staff_id, date, slot.start, slot.end);
          filled++;
        }
        if (filled < required) {
          warnings.push({ date, start_time: slot.start, end_time: slot.end, required, filled });
        }
      });
    });
    return { entries, warnings, skipped };
  }

  // as_requested：希望をそのまま採用。ただし1日の実働上限を超える長さの希望（例：6:00〜22:00）は
  // 「この時間内なら出勤できる」という範囲とみなし、下の範囲配置で法律の範囲内の長さに切り出す
  // （でお要望2026-10-07）。休み希望だけの人の出勤できる日（availability）も同じ範囲配置で扱う。
  const entries = [];
  const dayLimitOf = id => (limitsByStaff[id] || effectiveLimits(null)).hoursDay;
  const isWide = r => dayLimitOf(r.staff_id) !== null && workingHours(r.start_time, r.end_time) > dayLimitOf(r.staff_id) + 1e-9;
  const exact = workRequests.filter(r => !isWide(r));
  const windows = [
    ...workRequests.filter(isWide).map(r => ({ ...r, requested: true })),
    ...(availability || []).map(a => ({ ...a, requested: false })),
  ];

  [...exact].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (priorityMap[b.staff_id] || 0) - (priorityMap[a.staff_id] || 0))).forEach(r => {
    if (overlapsAssigned(r.staff_id, r.date, toMinutes(r.start_time), toMinutes(r.end_time))) return; // 適用済み・手動追加済みの希望は重複させない
    const reason = tracker.check(r.staff_id, r.date, workingHours(r.start_time, r.end_time));
    if (reason) { skipped.push({ staff_id: r.staff_id, date: r.date, start_time: r.start_time, end_time: r.end_time, reason }); return; }
    entries.push({ staff_id: r.staff_id, date: r.date, start_time: r.start_time, end_time: r.end_time });
    remember(r.staff_id, r.date, r.start_time, r.end_time);
  });

  // 範囲配置（他スタッフとのバランス）：
  //  ・日にち … その時点で配置が最も手薄な日から1コマずつ埋める（週の前半だけに人が偏らない）
  //  ・人     … 同じ日なら、出勤希望を出した人→勤務時間がまだ少ない人→優先度の高い人の順
  //  ・時間帯 … その日すでに入っている人数が少ない時間帯へ寄せる（朝・夕方などにずらす）
  //  法律・労働条件の上限に当たる候補は入れない（本人が出した範囲なら理由付きでskippedに残す）。
  const dayMinutes = {};
  Object.entries(assigned).forEach(([key, list]) => {
    const date = key.split('|')[1];
    dayMinutes[date] = (dayMinutes[date] || 0) + list.reduce((sum, x) => sum + (x.e - x.s), 0);
  });
  const coverageOf = (date, from, to) => {
    const cov = new Array(Math.max(0, Math.ceil((to - from) / 15))).fill(0);
    Object.entries(assigned).forEach(([key, list]) => {
      if (!key.endsWith(`|${date}`)) return;
      list.forEach(({ s: as, e: ae }) => {
        for (let t = Math.max(as, from); t < Math.min(ae, to); t += 15) cov[Math.floor((t - from) / 15)]++;
      });
    });
    return cov;
  };
  const rangeOfDay = {};
  windows.forEach(w => {
    const r = rangeOfDay[w.date] || (rangeOfDay[w.date] = { from: Infinity, to: -Infinity });
    r.from = Math.min(r.from, toMinutes(w.start_time));
    r.to = Math.max(r.to, toMinutes(w.end_time));
  });
  const pending = windows.filter(w => fitLength(w.start_time, w.end_time, dayLimitOf(w.staff_id)));
  while (pending.length) {
    let bi = 0;
    for (let i = 1; i < pending.length; i++) {
      const a = pending[i], c = pending[bi];
      const d = (dayMinutes[a.date] || 0) - (dayMinutes[c.date] || 0)
        || (c.requested - a.requested)
        || tracker.hoursSoFar(a.staff_id) - tracker.hoursSoFar(c.staff_id)
        || (priorityMap[c.staff_id] || 0) - (priorityMap[a.staff_id] || 0)
        || (a.date < c.date ? -1 : a.date > c.date ? 1 : 0);
      if (d < 0) bi = i;
    }
    const w = pending.splice(bi, 1)[0];
    if ((assigned[`${w.staff_id}|${w.date}`] || []).length) continue; // その日はすでに入っている
    const len = fitLength(w.start_time, w.end_time, dayLimitOf(w.staff_id));
    const ws = toMinutes(w.start_time), we = toMinutes(w.end_time);
    const { from, to } = rangeOfDay[w.date];
    const cov = coverageOf(w.date, from, to);
    let best = null;
    for (let st = ws; st + len <= we; st += 15) {
      let load = 0;
      for (let t = st; t < st + len; t += 15) load += cov[Math.floor((t - from) / 15)] || 0;
      if (best === null || load < best.load) best = { st, load };
    }
    if (!best) continue;
    const start = fmt(best.st), end = fmt(best.st + len);
    const reason = tracker.check(w.staff_id, w.date, workingHours(start, end));
    if (reason) {
      if (w.requested) skipped.push({ staff_id: w.staff_id, date: w.date, start_time: w.start_time, end_time: w.end_time, reason, range: true });
      continue;
    }
    entries.push({ staff_id: w.staff_id, date: w.date, start_time: start, end_time: end });
    remember(w.staff_id, w.date, start, end);
    dayMinutes[w.date] = (dayMinutes[w.date] || 0) + len;
  }
  return { entries, warnings: [], skipped };
}
