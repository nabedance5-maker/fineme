// New Me Log の冒頭のカレンダー（横にスクロールする日付の帯）の材料を作る。
// Muse指示書 第2弾 §11（渡邉承認 2026-11-24）。
//
// 帯に出すもの：
//   - 行った日・買った日（log.visits。無ければ last_visit）
//   - 予約日（本人が入れた next_visit）
//   - 次の目安日（薄い印）：前回 ＋ 本人の頻度設定（無ければ軸のふつうの間隔）。カード・LINEと同じ日。
//     予測ではなく「目安」として出す。
// 目安日が今日より前（過ぎている）の項目は、今日の欄に「目安を過ぎています」として寄せる。
//
// 日付はすべて端末の暦日 'YYYY-MM-DD' で扱う（toISOString は UTC になり、日本時間の朝9時前に
// 前日へずれるため使わない）。

import { effectiveFreq, formatFreq, idealNextDate, resolveAxis } from './log-axes';

export function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseYmd(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

function diffDays(a, b) {
  return Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
}

function visitDates(log) {
  const list = (Array.isArray(log?.visits) ? log.visits : [])
    .map(v => String(v?.visited_at || '').slice(0, 10)).filter(Boolean);
  if (log?.last_visit && !list.includes(String(log.last_visit).slice(0, 10))) list.push(String(log.last_visit).slice(0, 10));
  return [...new Set(list)].sort();
}

/**
 * 次の目安日と、その根拠の一言。
 * 日付はカードの「次の目安」・LINEのお知らせと同じ計算（idealNextDate：前回＋頻度）を使う。
 * 実際の平均間隔で別の日を出すと、同じ項目の目安が画面ごとに食い違うため（第2弾で直した
 * 「最初の一手が画面ごとに違う」と同じ種類のズレになる）。設定と実際の間隔のズレは
 * 「支出から見えること」の気づき（trendInsights の freq-drift）で伝える。
 * @returns {{ date: string, basis: string } | null}
 */
export function guideNextDate(log) {
  const dates = visitDates(log);
  const last = dates[dates.length - 1];
  if (!last) return null;
  const freq = effectiveFreq(log);
  const ideal = idealNextDate({ ...log, last_visit: last });
  if (!ideal || !freq) return null;
  return { date: ideal, basis: freq.estimated ? `この項目のふつうの間隔（${formatFreq(freq)}）` : `設定した頻度（${formatFreq(freq)}）` };
}

/**
 * 帯の日付と、日ごとの出来事。
 * @param {Array} logs listLogs() の返り値
 * @param {{ today?: string, pastDays?: number, futureDays?: number }} opts
 * @returns {{ days: Array<{date:string, events:Array}>, today: string, counts: {done:number, guide:number} }}
 *   event: { kind: 'done'|'booked'|'guide'|'overdue', logId, name, axisLabel, entryType, cost?, basis?, overdueDays? }
 */
export function buildLogCalendar(logs, opts = {}) {
  const today = opts.today || ymd(new Date());
  const pastDays = opts.pastDays ?? 45;
  const futureDays = opts.futureDays ?? 75;
  const from = addDays(today, -pastDays);
  const to = addDays(today, futureDays);
  const byDate = {};
  const push = (date, ev) => {
    if (date < from || date > to) return;
    (byDate[date] = byDate[date] || []).push(ev);
  };
  let done = 0;
  let guide = 0;

  for (const log of logs || []) {
    const def = resolveAxis(log.axis, log.custom_icon);
    const base = { logId: log.id, name: log.name || def.label, axisLabel: def.label, entryType: log.entry_type === 'purchase' ? 'purchase' : 'visit' };

    const costByDate = {};
    for (const v of (Array.isArray(log.visits) ? log.visits : [])) {
      const d = String(v?.visited_at || '').slice(0, 10);
      if (d) costByDate[d] = v.cost ?? log.cost ?? null;
    }
    for (const d of visitDates(log)) {
      if (d >= from && d <= to) done++;
      push(d, { ...base, kind: 'done', cost: costByDate[d] ?? log.cost ?? null });
    }

    const booked = log.next_visit ? String(log.next_visit).slice(0, 10) : null;
    if (booked && booked >= today) {
      push(booked, { ...base, kind: 'booked' });
      continue; // 予約が入っていれば目安は出さない（予約日のほうが本人にとって確かな日）
    }
    const g = guideNextDate(log);
    if (!g) continue;
    if (g.date < today) {
      push(today, { ...base, kind: 'overdue', basis: g.basis, overdueDays: diffDays(g.date, today) });
    } else {
      push(g.date, { ...base, kind: 'guide', basis: g.basis });
    }
    guide++;
  }

  const days = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push({ date: d, events: byDate[d] || [] });
  return { days, today, counts: { done, guide } };
}

/** 今月の実際の記録（行った・買ったの合計額と件数）。金額が分からない記録は件数だけ数える */
export function thisMonthRecorded(logs, today = ymd(new Date())) {
  const ym = today.slice(0, 7);
  let total = 0;
  let count = 0;
  for (const log of logs || []) {
    const costByDate = {};
    for (const v of (Array.isArray(log.visits) ? log.visits : [])) {
      const d = String(v?.visited_at || '').slice(0, 10);
      if (d) costByDate[d] = v.cost ?? null;
    }
    for (const d of visitDates(log)) {
      if (d.slice(0, 7) !== ym) continue;
      count++;
      const c = costByDate[d] ?? log.cost ?? null;
      if (c) total += c;
    }
  }
  return { total, count };
}
