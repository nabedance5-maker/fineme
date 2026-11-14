// シフトを外す・短くする時に、そのスタッフが担当する予約が勤務時間の外にはみ出さないか確かめる
// （2026-11-09 渡邉報告：「スタッフと部屋の両方」の店で、お客様の予約が入っているのに担当スタッフのシフトを外せてしまい、
// 人がいないのに予約がある状態になった）。2026-11-10 渡邉判断：確認ではなく、外せないようにする。
const toMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const fmt = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const ACTIVE = ['pending', 'approved', 'counter_proposed'];

// 予約の日付・時刻（承認済みは確定した日時、代わりの日時を提案中はその日時）
function whenOf(r) {
  if (r.status === 'counter_proposed' && r.counter_date) return { date: r.counter_date, time: r.counter_time || r.start_time };
  return { date: r.confirmed_date || r.reserved_date, time: r.confirmed_time || r.start_time };
}

// staffId の date の予約のうち、残すシフト（remaining: [{start_time, end_time}]）で覆えないもの
export async function reservationsOutsideShift(sb, { providerId, staffId, date, remaining }) {
  // 過ぎた日は止めない（済んだ予約が承認のまま残っていることがあり、過去のシフトの直しまで止めてしまうため）
  if (date < new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10)) return [];
  const { data: rows } = await sb.from('reservations')
    .select('id, user_id, user_name, user_contact, status, reserved_date, start_time, confirmed_date, confirmed_time, counter_date, counter_time, end_time, slot_id, service_id, class_id')
    .eq('provider_id', providerId).eq('staff_id', staffId).in('status', ACTIVE)
    .or(`reserved_date.eq.${date},confirmed_date.eq.${date},counter_date.eq.${date}`);
  const list = (rows || []).filter(r => !r.class_id && whenOf(r).date === date && whenOf(r).time);
  if (!list.length) return [];
  const slotIds = [...new Set(list.map(r => r.slot_id).filter(Boolean))];
  const svcIds = [...new Set(list.map(r => r.service_id).filter(Boolean))];
  const [{ data: slots }, { data: svcs }] = await Promise.all([
    slotIds.length ? sb.from('provider_slots').select('id, start_time, end_time').in('id', slotIds) : Promise.resolve({ data: [] }),
    svcIds.length ? sb.from('provider_services').select('id, duration_minutes').in('id', svcIds) : Promise.resolve({ data: [] }),
  ]);
  const slotDur = Object.fromEntries((slots || []).filter(s => s.start_time && s.end_time).map(s => [s.id, toMin(s.end_time) - toMin(s.start_time)]));
  const svcDur = Object.fromEntries((svcs || []).filter(s => s.duration_minutes).map(s => [s.id, s.duration_minutes]));
  // 残すシフトをつないだ時間帯
  const iv = (remaining || []).map(e => [toMin(e.start_time), toMin(e.end_time)]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const merged = [];
  for (const [a, b] of iv) { const l = merged[merged.length - 1]; if (l && a <= l[1]) l[1] = Math.max(l[1], b); else merged.push([a, b]); }
  return list.map(r => {
    const s = toMin(whenOf(r).time);
    const en = toMin(r.end_time || '');
    const e = r.end_time && en > s ? en : s + ((r.slot_id && slotDur[r.slot_id]) || (r.service_id && svcDur[r.service_id]) || 60);
    return { id: r.id, name: r.user_name || 'お客様', start: s, end: e, user_id: r.user_id || null, contact: r.user_contact || '', status: r.status };
  }).filter(x => !merged.some(([a, b]) => a <= x.start && x.end <= b))
    .map(x => ({ id: x.id, name: x.name, date, time: `${fmt(x.start)}〜${fmt(x.end)}`, user_id: x.user_id, contact: x.contact, status: x.status }));
}

export function outsideMessage(list) {
  return `この時間に担当の予約があります（${list.map(x => `${x.time} ${x.name}様`).join('、')}）。予約がある間はシフトを外せません。先に予約の担当スタッフか日時を変えるか、お店の都合でキャンセルしてください。`;
}

// ── 予約がある所を「人がいない・お店が閉まっている」状態にさせない（2026-11-15 渡邉要望：
// 「店舗運営においてあり得ないことは設定できないようにしてほしい」）。臨時休業・休憩ブロック・営業時間の変更で使う。
// from〜to（今日より前は見ない）の、まだ済んでいない予約（リクエスト中・承認済み・代わりの日時を提案中）を、日付と分で返す。
export async function activeReservationsBetween(sb, { providerId, from, to, staffId = null }) {
  const today = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const lo = from < today ? today : from;
  if (to < lo) return [];
  const cols = 'id, user_name, status, reserved_date, start_time, confirmed_date, confirmed_time, counter_date, counter_time, end_time, slot_id, service_id, class_id, staff_id';
  let q = sb.from('reservations').select(cols).eq('provider_id', providerId).in('status', ACTIVE)
    .or(`and(reserved_date.gte.${lo},reserved_date.lte.${to}),and(confirmed_date.gte.${lo},confirmed_date.lte.${to}),and(counter_date.gte.${lo},counter_date.lte.${to})`)
    .limit(2000);
  if (staffId) q = q.eq('staff_id', staffId);
  const { data: rows } = await q;
  const list = (rows || []).filter(r => { const w = whenOf(r); return w.time && w.date >= lo && w.date <= to; });
  if (!list.length) return [];
  const svcIds = [...new Set(list.map(r => r.service_id).filter(Boolean))];
  const { data: svcs } = svcIds.length ? await sb.from('provider_services').select('id, duration_minutes').in('id', svcIds) : { data: [] };
  const svcDur = Object.fromEntries((svcs || []).filter(s => s.duration_minutes).map(s => [s.id, s.duration_minutes]));
  return list.map(r => {
    const w = whenOf(r);
    const s = toMin(w.time);
    const en = toMin(r.end_time || '');
    const e = r.end_time && en > s ? en : s + ((r.service_id && svcDur[r.service_id]) || 60);
    return { id: r.id, name: r.user_name || 'お客様', date: w.date, start: s, end: e, staff_id: r.staff_id || null, class_id: r.class_id || null, time: `${fmt(s)}〜${fmt(e)}` };
  }).sort((a, b) => (a.date + String(a.start).padStart(4, '0')).localeCompare(b.date + String(b.start).padStart(4, '0')));
}

export function reservationListText(list, max = 5) {
  const head = list.slice(0, max).map(x => `${x.date.slice(5).replace('-', '/')} ${x.time} ${x.name}様`).join('、');
  return list.length > max ? `${head} ほか${list.length - max}件` : head;
}

export { toMin as hmToMinutes };
