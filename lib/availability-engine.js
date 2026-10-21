// 予約を受けられる時間の計算（でお要望 2026-10-21：「空き枠」を店舗に作らせるのをやめ、店舗がすでに登録している情報から毎回計算する）。
//
// 材料：営業時間・臨時休業日・予約の締切・シフト（シフト管理を使う店舗）・休憩/外出ブロック・入っている予約・
//       グループレッスンの開催回（担当者と部屋をその時間ふさぐ）・部屋・メニューの長さ・メニューを担当できるスタッフ。
// 受付の単位（providers.booking_unit）：
//   staff    … スタッフで受ける（そのスタッフが出勤中で、予約・レッスン・休憩が入っていなければ空き）
//   resource … 部屋・席で受ける（部屋の数だけ同時に受ける）
//   both     … スタッフと部屋の両方が空いている時だけ受ける
//   capacity … 人数で受ける（店全体で同時に store_capacity 人まで）
// 空（未設定）の時は、予約を受けるスタッフがいれば staff、いなければ capacity とみなす。
// 公開の空き時間一覧（/api/providers/[slug]/availability）と、予約の受付（/api/reservations）の両方で同じ計算を使う。
import { hasFeature } from '@/lib/feature-flags';
import { getShiftScheduleForRange } from '@/lib/shift-availability';
import { isPastBookingCutoff } from '@/lib/booking-cutoff';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const OCCUPY = ['approved', 'visited'];
const toMin = t => { if (!t) return null; const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
const toHHMM = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const overlap = (a1, a2, b1, b2) => a1 < b2 && a2 > b1;
const dateList = (from, to) => {
  const out = []; const d = new Date(`${from}T00:00:00Z`); const e = new Date(`${to}T00:00:00Z`);
  while (d <= e && out.length < 62) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
};
const jstNowMin = () => { const n = new Date(Date.now() + 9 * 3600000); return { date: n.toISOString().slice(0, 10), min: n.getUTCHours() * 60 + n.getUTCMinutes() }; };

export const UNIT_LABEL = { staff: 'スタッフで受ける', resource: '部屋・席で受ける', both: 'スタッフと部屋の両方', capacity: '人数で受ける' };

export function effectiveUnit(provider, staff) {
  if (provider.booking_unit) return provider.booking_unit;
  return (staff || []).some(s => s.bookable !== false) ? 'staff' : 'capacity';
}

// 期間内の材料をまとめて読む
export async function loadContext(db, provider, from, to) {
  const pid = provider.id;
  const [staffR, resR, svcR, clsR, resvR, sessR, blockR, closedR] = await Promise.all([
    db.from('provider_staff').select('id, name, bookable, booking_fee, sort_order').eq('provider_id', pid).order('sort_order'),
    db.from('provider_resources').select('id, name, active').eq('provider_id', pid).order('sort_order'),
    db.from('provider_services').select('id, name, duration_minutes, staff_ids, resource_ids, booking_scope').eq('provider_id', pid),
    db.from('provider_classes').select('id, instructor_staff_id, resource_id').eq('provider_id', pid),
    db.from('reservations').select('id, status, reserved_date, confirmed_date, start_time, confirmed_time, staff_id, resource_id, service_id, slot_id, class_id')
      .eq('provider_id', pid).in('status', OCCUPY).gte('reserved_date', addDays(from, -1)).lte('reserved_date', addDays(to, 1)).limit(5000),
    db.from('provider_slots').select('id, date, start_time, end_time, staff_id, resource_id, class_id').eq('provider_id', pid).not('class_id', 'is', null).gte('date', from).lte('date', to).limit(3000),
    db.from('provider_staff_blocks').select('staff_id, date, start_time, end_time').eq('provider_id', pid).gte('date', from).lte('date', to),
    db.from('provider_closed_dates').select('date').eq('provider_id', pid).gte('date', from).lte('date', to),
  ]);
  const staff = (staffR.data || []);
  const resources = (resR.data || []).filter(r => r.active !== false);
  const services = Object.fromEntries((svcR.data || []).map(s => [s.id, s]));
  const classes = Object.fromEntries((clsR.data || []).map(c => [c.id, c]));
  const shift = hasFeature(provider, 'shift_management') ? await getShiftScheduleForRange(db, pid, from, to) : null;

  // 予約に使われた枠の長さ（即時予約の旧方式の予約）
  const slotIds = [...new Set((resvR.data || []).filter(r => r.slot_id && !r.class_id).map(r => r.slot_id))];
  const slotDur = {};
  if (slotIds.length) {
    const { data } = await db.from('provider_slots').select('id, start_time, end_time').in('id', slotIds);
    (data || []).forEach(s => { slotDur[s.id] = toMin(s.end_time) - toMin(s.start_time); });
  }

  const busy = { staff: {}, resource: {}, anonStaff: {}, anonResource: {}, all: {} };
  const push = (map, key, date, iv) => { ((map[key] = map[key] || {})[date] = map[key][date] || []).push(iv); };
  const unit = effectiveUnit(provider, staff);
  for (const r of resvR.data || []) {
    if (r.class_id) continue; // グループレッスンの予約は開催回の方でふさぐ
    const date = r.confirmed_date || r.reserved_date;
    const s = toMin(r.confirmed_time || r.start_time);
    if (!date || s == null) continue;
    const dur = (r.slot_id && slotDur[r.slot_id]) || services[r.service_id]?.duration_minutes || 60;
    const iv = { s, e: s + dur };
    ((busy.all[date] = busy.all[date] || [])).push(iv);
    if (r.staff_id) push(busy.staff, r.staff_id, date, iv); else ((busy.anonStaff[date] = busy.anonStaff[date] || [])).push(iv);
    if (r.resource_id) push(busy.resource, r.resource_id, date, iv); else ((busy.anonResource[date] = busy.anonResource[date] || [])).push(iv);
  }
  // グループレッスンの開催中は、担当者と部屋をふさぐ（でお要望 2026-10-21）
  for (const x of sessR.data || []) {
    const cls = classes[x.class_id] || {};
    const iv = { s: toMin(x.start_time), e: toMin(x.end_time), lesson: true };
    const st = x.staff_id || cls.instructor_staff_id; const rs = x.resource_id || cls.resource_id;
    if (st) push(busy.staff, st, x.date, iv);
    if (rs) push(busy.resource, rs, x.date, iv);
  }
  for (const b of blockR.data || []) if (b.staff_id) push(busy.staff, b.staff_id, b.date, { s: toMin(b.start_time), e: toMin(b.end_time) });

  return {
    provider, unit, staff, resources, services, shift, busy,
    interval: Math.max(5, Number(provider.booking_interval_minutes) || 30),
    capacity: Math.max(1, Number(provider.store_capacity) || 1),
    closed: new Set((closedR.data || []).map(c => c.date)),
  };
}

function addDays(ymd, n) { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

function openWindow(ctx, date) {
  if (ctx.closed.has(date)) return null;
  const h = (ctx.provider.business_hours || {})[WEEKDAY_KEYS[new Date(`${date}T00:00:00Z`).getUTCDay()]];
  if (!h || h.closed || !h.open || !h.close) return null;
  const s = toMin(h.open); let e = toMin(h.close);
  if (e <= s) e = 24 * 60; // 日をまたぐ営業は、この計算ではその日の24時までとして扱う
  return { s, e };
}
// スタッフがその時間に働いているか（シフト管理の店舗は確定シフト、それ以外は営業時間）
function staffWorking(ctx, staffId, date, s, e, win) {
  if (!ctx.shift) return s >= win.s && e <= win.e;
  if (!ctx.shift.coveredDates.has(date)) return false;
  return ((ctx.shift.windowsByStaffDate[staffId] || {})[date] || []).some(w => toMin(w.start) <= s && toMin(w.end) >= e);
}
const freeOf = (list, s, e) => !(list || []).some(iv => overlap(s, e, iv.s, iv.e));
const countOverlap = (list, s, e) => (list || []).filter(iv => overlap(s, e, iv.s, iv.e)).length;

// その時間に予約を受けられるか。受けられる場合は、割り当てられるスタッフ・部屋の候補を返す
export function evaluate(ctx, { service, date, s, staffId }) {
  const win = openWindow(ctx, date);
  if (!win) return null;
  const dur = service?.duration_minutes || 60;
  const e = s + dur;
  if (s < win.s || e > win.e) return null;
  const unit = ctx.unit;
  const needStaff = unit === 'staff' || unit === 'both';
  const res = ctx.resources.filter(r => !(service?.resource_ids || []).length || service.resource_ids.includes(r.id));
  const needRes = unit === 'resource' || unit === 'both' || (unit === 'staff' && (service?.resource_ids || []).length > 0);
  let staffOk = [], resOk = [];
  if (needStaff) {
    const eligible = ctx.staff.filter(x => x.bookable !== false && (!(service?.staff_ids || []).length || service.staff_ids.includes(x.id)));
    const free = eligible.filter(x => staffWorking(ctx, x.id, date, s, e, win) && freeOf((ctx.busy.staff[x.id] || {})[date], s, e));
    const anon = countOverlap(ctx.busy.anonStaff[date], s, e); // 担当の決まっていない予約も、誰か1人をふさいでいる
    if (free.length - anon < 1) return null;
    staffOk = staffId ? free.filter(x => x.id === staffId) : free;
    if (!staffOk.length) return null;
  }
  if (needRes) {
    if (!res.length) {
      if (unit !== 'staff') return null; // 部屋で受けるのに部屋が無い
    } else {
      const free = res.filter(r => freeOf((ctx.busy.resource[r.id] || {})[date], s, e));
      const anon = unit === 'resource' || unit === 'both' ? countOverlap(ctx.busy.anonResource[date], s, e) : 0;
      if (free.length - anon < 1) return null;
      resOk = free;
    }
  }
  if (unit === 'capacity' && countOverlap(ctx.busy.all[date], s, e) >= ctx.capacity) return null;
  return { start: s, end: e, staffIds: staffOk.map(x => x.id), resourceIds: resOk.map(r => r.id) };
}

// 期間の受けられる開始時刻の一覧
export function availableStarts(ctx, { service, from, to, staffId }) {
  const now = jstNowMin();
  const out = [];
  for (const date of dateList(from, to)) {
    if (date < now.date) continue;
    const win = openWindow(ctx, date);
    if (!win) continue;
    for (let s = win.s; s + (service?.duration_minutes || 60) <= win.e; s += ctx.interval) {
      if (date === now.date && s <= now.min) continue;
      if (isPastBookingCutoff(ctx.provider, date, toHHMM(s))) continue;
      const r = evaluate(ctx, { service, date, s, staffId });
      if (r) out.push({ date, start_time: toHHMM(r.start), end_time: toHHMM(r.end), staff_ids: r.staffIds, resource_ids: r.resourceIds });
    }
  }
  return out;
}

// 予約を入れる直前の確認と、スタッフ・部屋の割り当て（指名が無ければ、その日の予約が少ないスタッフから）
export async function checkAndAssign(db, provider, { serviceId, date, startTime, staffId }) {
  const ctx = await loadContext(db, provider, date, date);
  const service = serviceId ? ctx.services[serviceId] : null;
  if (serviceId && !service) return { ok: false, error: 'メニューが見つかりません' };
  const s = toMin(startTime);
  if (s == null) return { ok: false, error: '時間が正しくありません' };
  const now = jstNowMin();
  if (date < now.date || (date === now.date && s <= now.min)) return { ok: false, error: '過ぎた時間は予約できません' };
  if (isPastBookingCutoff(provider, date, toHHMM(s))) return { ok: false, error: 'この時間の予約受付は締め切りました' };
  const r = evaluate(ctx, { service, date, s, staffId });
  if (!r) return { ok: false, error: staffId ? 'このスタッフはその時間に予約を受けられません。別の時間か、指名なしでお選びください' : 'その時間はご予約いっぱいです。別の時間をお選びください' };
  const load = id => ((ctx.busy.staff[id] || {})[date] || []).length;
  const pickStaff = staffId || [...r.staffIds].sort((a, b) => load(a) - load(b))[0] || null;
  const pickRes = r.resourceIds[0] || null;
  return { ok: true, staffId: pickStaff, resourceId: pickRes, endTime: toHHMM(r.end), autoAssigned: !staffId && !!pickStaff, unit: ctx.unit };
}

// グループレッスンの開催回を作る・動かす時に、担当者・部屋がふさがっていないか（でお要望 2026-10-21：相互の関係）
// 個別の予約（確定済み）・他のレッスンの開催回・休憩ブロックと重なれば、理由の文を返す。重ならなければ null
export async function lessonConflict(db, providerId, { date, startTime, endTime, staffId, resourceId, excludeSlotId }) {
  if (!date || !startTime || !endTime || (!staffId && !resourceId)) return null;
  const s = toMin(startTime), e = toMin(endTime);
  const [{ data: resv }, { data: sess }, { data: blocks }, { data: classes }, { data: svcs }] = await Promise.all([
    db.from('reservations').select('staff_id, resource_id, confirmed_date, reserved_date, confirmed_time, start_time, service_id, slot_id, class_id, user_name')
      .eq('provider_id', providerId).in('status', OCCUPY).or(`confirmed_date.eq.${date},reserved_date.eq.${date}`),
    db.from('provider_slots').select('id, start_time, end_time, staff_id, resource_id, class_id').eq('provider_id', providerId).eq('date', date).not('class_id', 'is', null),
    staffId ? db.from('provider_staff_blocks').select('start_time, end_time').eq('provider_id', providerId).eq('staff_id', staffId).eq('date', date) : { data: [] },
    db.from('provider_classes').select('id, name, instructor_staff_id, resource_id').eq('provider_id', providerId),
    db.from('provider_services').select('id, duration_minutes').eq('provider_id', providerId),
  ]);
  const cls = Object.fromEntries((classes || []).map(c => [c.id, c]));
  const dur = Object.fromEntries((svcs || []).map(x => [x.id, x.duration_minutes]));
  for (const r of resv || []) {
    if (r.class_id || (r.confirmed_date || r.reserved_date) !== date) continue;
    const rs = toMin(r.confirmed_time || r.start_time); const re = rs + (dur[r.service_id] || 60);
    if (!overlap(s, e, rs, re)) continue;
    if (staffId && r.staff_id === staffId) return `その時間、担当者に個別の予約（${toHHMM(rs)}〜）が入っています`;
    if (resourceId && r.resource_id === resourceId) return `その時間、部屋に個別の予約（${toHHMM(rs)}〜）が入っています`;
  }
  for (const x of sess || []) {
    if (x.id === excludeSlotId) continue;
    const c = cls[x.class_id] || {};
    if (!overlap(s, e, toMin(x.start_time), toMin(x.end_time))) continue;
    if (staffId && (x.staff_id || c.instructor_staff_id) === staffId) return `その時間、担当者は別のレッスン（${c.name || ''} ${String(x.start_time).slice(0, 5)}〜）を担当しています`;
    if (resourceId && (x.resource_id || c.resource_id) === resourceId) return `その時間、部屋は別のレッスン（${c.name || ''} ${String(x.start_time).slice(0, 5)}〜）で使っています`;
  }
  for (const b of blocks || []) if (overlap(s, e, toMin(b.start_time), toMin(b.end_time))) return 'その時間、担当者は休憩・外出の予定です';
  return null;
}
