// シフト希望の「提出の区切り」（でお指摘 2026-10-16：最初に期間を作らせるのは不要な手間で分かりづらい。
// 希望は期間と関係なく出せて、お店ごとの提出ルールがあればよい。どの期間を作るかはシフトを作る時に選ぶ）。
//
// 店舗は「何ごとに提出してもらうか（1か月・半月・2週間・1週間）」と「締切」を一度だけ決める。
// スタッフの提出画面は、このルールから自動で次の区切り（例：11月分・締切10/20）を並べ、
// 区切りごとに「提出を完了する」を押す。希望そのものは日付単位で保存し、期間には紐づけない。
// 区切りのキーは開始日（YYYY-MM-DD）。
import { jstToday } from './shift-deadline.js';

export const CYCLES = {
  monthly: '1か月ごと',
  half_month: '半月ごと（1〜15日・16日〜月末）',
  biweekly: '2週間ごと（月曜はじまり）',
  weekly: '1週間ごと（月曜はじまり）',
};

// 2週間ごとの区切りの基準日（月曜）。どの店舗でも同じ区切りになる
const BIWEEKLY_ANCHOR = '2026-01-05';

// notify_days_before：お店のLINEに未提出の人数を知らせる日（締切の何日前。0=当日）
// remind_staff / staff_notify_days_before：未提出のスタッフ本人へLINEで提出を促す日（でお要望 2026-10-22）
export const DEFAULT_CYCLE = { cycle: 'monthly', deadline_day: 20, deadline_days_before: 7, notify_days_before: [1, 0], remind_staff: true, staff_notify_days_before: [3, 1, 0] };

const pad = n => String(n).padStart(2, '0');
const ymd = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const lastDayOf = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m は1〜12

export function normalizeCycle(v) {
  const c = v && typeof v === 'object' ? v : {};
  const cycle = CYCLES[c.cycle] ? c.cycle : DEFAULT_CYCLE.cycle;
  const day = Math.floor(Number(c.deadline_day));
  const before = Math.floor(Number(c.deadline_days_before));
  const days = (v, def) => (Array.isArray(v)
    ? [...new Set(v.map(Number))].filter(n => Number.isInteger(n) && n >= 0 && n <= 60).sort((a, b) => b - a)
    : def);
  return {
    cycle,
    deadline_day: Number.isFinite(day) && day >= 1 && day <= 31 ? day : DEFAULT_CYCLE.deadline_day,
    deadline_days_before: Number.isFinite(before) && before >= 0 && before <= 60 ? before : DEFAULT_CYCLE.deadline_days_before,
    notify_days_before: days(c.notify_days_before, DEFAULT_CYCLE.notify_days_before),
    remind_staff: c.remind_staff === undefined ? DEFAULT_CYCLE.remind_staff : !!c.remind_staff,
    staff_notify_days_before: days(c.staff_notify_days_before, DEFAULT_CYCLE.staff_notify_days_before),
  };
}

// date を含む区切り
export function windowOf(date, cfg) {
  const { cycle } = normalizeCycle(cfg);
  const [y, m, d] = date.split('-').map(Number);
  if (cycle === 'monthly') return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(lastDayOf(y, m))}` };
  if (cycle === 'half_month') {
    return d <= 15
      ? { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-15` }
      : { start: `${y}-${pad(m)}-16`, end: `${y}-${pad(m)}-${pad(lastDayOf(y, m))}` };
  }
  const len = cycle === 'biweekly' ? 14 : 7;
  const diff = Math.round((new Date(date + 'T00:00:00Z') - new Date(BIWEEKLY_ANCHOR + 'T00:00:00Z')) / 86400000);
  const offset = ((diff % len) + len) % len;
  const start = addDays(date, -offset);
  return { start, end: addDays(start, len - 1) };
}

// 区切りの締切（その日の終わりまで）
export function deadlineOf(win, cfg) {
  const c = normalizeCycle(cfg);
  if (c.cycle === 'monthly') {
    const [y, m] = win.start.split('-').map(Number);
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    return `${py}-${pad(pm)}-${pad(Math.min(c.deadline_day, lastDayOf(py, pm)))}`;
  }
  return addDays(win.start, -c.deadline_days_before);
}

const md = s => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}`;
export function windowLabel(win, cfg) {
  const { cycle } = normalizeCycle(cfg);
  if (cycle === 'monthly') return `${Number(win.start.slice(5, 7))}月分`;
  return `${md(win.start)}〜${md(win.end)}`;
}

// スタッフが希望を出せる区切り：まだ始まっていない次の区切りから count 個
export function upcomingWindows(cfg, { today = jstToday(), count = 3 } = {}) {
  const out = [];
  let w = windowOf(today, cfg);
  if (w.start <= today) w = windowOf(addDays(w.end, 1), cfg);
  while (out.length < count) {
    out.push({ ...w, key: w.start, deadline: deadlineOf(w, cfg), label: windowLabel(w, cfg) });
    w = windowOf(addDays(w.end, 1), cfg);
  }
  return out;
}

// 指定のキー（開始日）が、いま希望を出せる区切りなら返す
export function findOpenWindow(key, cfg, opts) {
  return upcomingWindows(cfg, { count: 6, ...(opts || {}) }).find(w => w.key === key) || null;
}

export function describeCycle(cfg) {
  const c = normalizeCycle(cfg);
  return c.cycle === 'monthly'
    ? `${CYCLES.monthly}・締切は前の月の${c.deadline_day}日`
    : `${CYCLES[c.cycle]}・締切は始まる${c.deadline_days_before}日前`;
}

// 店舗の提出ルール（未設定なら既定）
export async function loadCycle(db, providerId) {
  const { data } = await db.from('provider_shift_settings').select('submit_cycle, request_format').eq('provider_id', providerId).maybeSingle();
  return { cycle: normalizeCycle(data?.submit_cycle), request_format: data?.request_format || null };
}

// 日付範囲（作るシフトの期間など）に重なる区切りで「提出を完了」したスタッフ → { staff_id: submitted_at }
export async function loadSubmittedInRange(db, providerId, from, to) {
  const { data } = await db.from('provider_shift_window_submissions').select('staff_id, submitted_at')
    .eq('provider_id', providerId).lte('window_start', to).gte('window_end', from);
  const out = {};
  (data || []).forEach(r => { if (!out[r.staff_id] || r.submitted_at > out[r.staff_id]) out[r.staff_id] = r.submitted_at; });
  return out;
}
