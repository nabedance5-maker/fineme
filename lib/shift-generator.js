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

function toMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

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
 * @returns {{entries: Array<{staff_id:string, date:string, start_time:string, end_time:string}>, warnings: Array<{date:string, start_time:string, end_time:string, required:number, filled:number}>}}
 */
export function generateShift({ period, requests, ruleType, dayPatterns, patternsById, priorities }) {
  const priorityMap = {};
  (priorities || []).forEach(p => { priorityMap[p.staff_id] = p.priority_score || 0; });

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

        // その日・その枠に重なる出勤希望を出しているスタッフだけを候補にする
        const candidates = workRequests.filter(r => {
          if (r.date !== date) return false;
          const rs = toMinutes(r.start_time), re = toMinutes(r.end_time);
          return rs !== null && re !== null && rs < slotEnd && re > slotStart;
        });
        // 優先度ポイントの高い順（店長・社員など、必ず現場にいてほしい人を高くする運用）
        candidates.sort((a, b) => (priorityMap[b.staff_id] || 0) - (priorityMap[a.staff_id] || 0));

        const chosen = candidates.slice(0, required);
        chosen.forEach(r => {
          entries.push({ staff_id: r.staff_id, date, start_time: slot.start, end_time: slot.end });
        });
        if (chosen.length < required) {
          warnings.push({ date, start_time: slot.start, end_time: slot.end, required, filled: chosen.length });
        }
      });
    });
    return { entries, warnings };
  }

  // as_requested：希望をそのまま採用
  const entries = workRequests.map(r => ({ staff_id: r.staff_id, date: r.date, start_time: r.start_time, end_time: r.end_time }));
  return { entries, warnings: [] };
}
