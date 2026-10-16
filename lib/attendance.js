// 勤怠管理（でお要望2026-10-14）：店頭タブレット1台で打刻。時刻はサーバーの時刻で記録し、
// 打刻は消さない（修正は取り消し＋追加）。ここは暗証番号・端末トークンの扱いと、打刻から
// 1日の勤務（実働・休憩・残業・深夜・シフトとの差）を組み立てる計算をまとめる。
import { createHash, randomBytes, scryptSync, timingSafeEqual, randomInt } from 'crypto';
import { spanOf } from './time-span.js';

export const PUNCH_LABEL = { in: '出勤', break_start: '休憩開始', break_end: '休憩終了', out: '退勤' };
const JST = 9 * 3600 * 1000;
const MIN = 60 * 1000;

export function hashToken(token) { return createHash('sha256').update(String(token)).digest('hex'); }
export function newToken() { return randomBytes(32).toString('hex'); }
export function newPairingCode() { return String(randomInt(100000, 1000000)); }

export function hashPin(pin) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(String(pin), salt, 32).toString('hex')}`;
}
export function verifyPin(pin, stored) {
  if (!stored || !String(stored).includes(':')) return false;
  const [salt, hash] = String(stored).split(':');
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(String(pin), salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const isValidPin = pin => /^\d{4,6}$/.test(String(pin || ''));

export const jstDate = iso => new Date(new Date(iso).getTime() + JST).toISOString().slice(0, 10);
export const jstTime = iso => new Date(new Date(iso).getTime() + JST).toISOString().slice(11, 16);
// "YYYY-MM-DDTHH:mm"（日本時間）→ ISO
export const jstLocalToIso = local => new Date(new Date(`${local}:00Z`).getTime() - JST).toISOString();

// 打刻中のスタッフの今の状態。出勤から20時間たっても退勤がなければ打ち忘れとみなして「勤務外」
export function currentStatus(punches, now = Date.now()) {
  const sorted = [...punches].filter(p => !p.voided_at).sort((a, b) => new Date(a.punched_at) - new Date(b.punched_at));
  let status = 'off', since = null;
  for (const p of sorted) {
    if (p.kind === 'in') { status = 'working'; since = p.punched_at; }
    else if (p.kind === 'break_start' && status === 'working') status = 'break';
    else if (p.kind === 'break_end' && status === 'break') status = 'working';
    else if (p.kind === 'out') { status = 'off'; since = null; }
  }
  if (status !== 'off' && since && now - new Date(since).getTime() > 20 * 3600 * 1000) return { status: 'off', since: null, stale: true };
  return { status, since };
}

export function allowedKinds(status) {
  if (status === 'working') return ['break_start', 'out'];
  if (status === 'break') return ['break_end', 'out'];
  return ['in'];
}

// 区間 [a,b) のうち深夜（22:00〜翌5:00・日本時間）にあたる分数
function nightMinutes(a, b) {
  let total = 0;
  const startDay = new Date(jstDate(new Date(a).toISOString()) + 'T00:00:00Z').getTime() - JST - 24 * 3600 * 1000;
  for (let d = startDay; d < b; d += 24 * 3600 * 1000) {
    const ns = d + 22 * 3600 * 1000, ne = d + 29 * 3600 * 1000; // その日の22時〜翌5時
    total += Math.max(0, Math.min(b, ne) - Math.max(a, ns));
  }
  return Math.round(total / MIN);
}

/**
 * 有効な打刻から1日ごとの勤務を組み立てる。勤務日は出勤した日（日本時間）。日付またぎの退勤も同じ勤務に入る。
 * @param punches 有効・取り消し済みを含む打刻
 * @param shifts  確定シフト [{staff_id,date,start_time,end_time}]
 */
export function buildWorkdays(punches, shifts = []) {
  const byStaff = {};
  punches.filter(p => !p.voided_at).forEach(p => { (byStaff[p.staff_id] = byStaff[p.staff_id] || []).push(p); });
  const days = [];
  Object.entries(byStaff).forEach(([staffId, list]) => {
    list.sort((a, b) => new Date(a.punched_at) - new Date(b.punched_at));
    let cur = null;
    const close = () => { if (cur) days.push(cur); cur = null; };
    for (const p of list) {
      const t = new Date(p.punched_at).getTime();
      if (p.kind === 'in') {
        if (cur) { cur.issues.push('退勤の打刻がありません'); close(); }
        cur = { staff_id: staffId, date: jstDate(p.punched_at), in: p.punched_at, out: null, breaks: [], issues: [], punch_ids: [p.id] };
      } else if (!cur) {
        days.push({ staff_id: staffId, date: jstDate(p.punched_at), in: null, out: p.kind === 'out' ? p.punched_at : null, breaks: [], issues: [`出勤の打刻がないまま「${PUNCH_LABEL[p.kind]}」があります`], punch_ids: [p.id] });
      } else {
        cur.punch_ids.push(p.id);
        if (p.kind === 'break_start') cur.breaks.push({ start: p.punched_at, end: null });
        else if (p.kind === 'break_end') {
          const open = [...cur.breaks].reverse().find(b => !b.end);
          if (open) open.end = p.punched_at; else cur.issues.push('休憩開始のない休憩終了があります');
        } else if (p.kind === 'out') {
          cur.breaks.filter(b => !b.end).forEach(b => { b.end = p.punched_at; });
          cur.out = p.punched_at;
          close();
        }
        void t;
      }
    }
    if (cur) {
      // 出勤から20時間以内で退勤がまだなら勤務中（打ち忘れではない）
      if (Date.now() - new Date(cur.in).getTime() < 20 * 3600 * 1000) cur.working = true;
      else cur.issues.push('退勤の打刻がありません');
      close();
    }
  });

  const shiftKey = {};
  shifts.forEach(s => { (shiftKey[`${s.staff_id}|${s.date}`] = shiftKey[`${s.staff_id}|${s.date}`] || []).push(s); });

  days.forEach(d => {
    d.work_min = 0; d.break_min = 0; d.overtime_min = 0; d.night_min = 0; d.late_min = 0; d.early_min = 0;
    if (d.in && d.out) {
      const a = new Date(d.in).getTime(), b = new Date(d.out).getTime();
      const breaks = d.breaks.filter(x => x.start && x.end).map(x => [Math.max(a, new Date(x.start).getTime()), Math.min(b, new Date(x.end).getTime())]).filter(([x, y]) => y > x);
      d.break_min = Math.round(breaks.reduce((s, [x, y]) => s + (y - x), 0) / MIN);
      d.work_min = Math.max(0, Math.round((b - a) / MIN) - d.break_min);
      d.overtime_min = Math.max(0, d.work_min - 8 * 60);
      d.night_min = Math.max(0, nightMinutes(a, b) - breaks.reduce((s, [x, y]) => s + nightMinutes(x, y), 0));
      if (d.work_min > 6 * 60 && d.break_min < (d.work_min > 8 * 60 ? 60 : 45)) d.issues.push(`休憩が法定の最低時間（${d.work_min > 8 * 60 ? 60 : 45}分）に足りません`);
    }
    const sh = (shiftKey[`${d.staff_id}|${d.date}`] || []).map(s => ({ ...s, sp: spanOf(s.start_time, s.end_time) })).filter(s => s.sp).sort((x, y) => x.sp.s - y.sp.s);
    if (sh.length) {
      d.shift = { start_time: sh[0].start_time, end_time: sh[sh.length - 1].end_time };
      const base = new Date(d.date + 'T00:00:00Z').getTime() - JST;
      const shiftStart = base + sh[0].sp.s * MIN, shiftEnd = base + sh[sh.length - 1].sp.e * MIN;
      if (d.in) d.late_min = Math.max(0, Math.round((new Date(d.in).getTime() - shiftStart) / MIN));
      if (d.out) d.early_min = Math.max(0, Math.round((shiftEnd - new Date(d.out).getTime()) / MIN));
    }
  });
  return days.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : String(x.in || '').localeCompare(String(y.in || ''))));
}
