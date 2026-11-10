// 店舗が管理画面から予約を入れる・担当や部屋を変える・日時を変える時の確認（2026-11-10 渡邉報告）。
// お客様の予約画面と同じ材料（lib/availability-engine.js の loadContext：シフト・休憩ブロック・入っている予約・
// グループレッスン・部屋・メニュー）で、次を確かめる。営業時間外は、お店の判断で入れられるように止めない。
//   - 担当スタッフ：シフト（シフト管理の店舗）に入っているか、同じ時間に別の予約・レッスン・休憩が無いか
//   - 部屋：そのメニューで使える部屋か、同じ時間に別の予約・レッスンが無いか
//   - 受付の単位が「スタッフ」「両方」なのに担当が空いていない／「部屋」「両方」なのに部屋が空いていない
//   - 同じお客様が同じ時間に別の予約を持っていないか
// 担当・部屋が未指定で、単位として必要な時は、空いている人・部屋を割り当てて返す。
import { loadContext, openWindow, staffWorking } from '@/lib/availability-engine';

const toMin = t => { if (!t) return null; const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
const hhmm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
const overlap = (a1, a2, b1, b2) => a1 < b2 && a2 > b1;

// 戻り値：{ ok: true, staffId, resourceId } または { ok: false, error }
export async function checkStoreBooking(db, provider, { date, startTime, endTime, staffId = null, resourceId = null, serviceId = null, userId = null, userName = '', userContact = '', excludeId = null }) {
  const s = toMin(startTime), e = toMin(endTime);
  if (s == null || e == null || e <= s) return { ok: false, error: '開始と終了の時刻を正しく入れてください' };
  const ctx = await loadContext(db, provider, date, date);
  const service = serviceId ? ctx.services[serviceId] : null;
  const unit = ctx.unit;
  const needStaff = unit === 'staff' || unit === 'both';
  const needRes = unit === 'resource' || unit === 'both' || (service?.resource_ids || []).length > 0;
  const others = list => (list || []).filter(iv => !excludeId || iv.id !== excludeId);
  const clash = list => others(list).find(iv => overlap(s, e, iv.s, iv.e));
  const win = openWindow(ctx, date) || { s: 0, e: 24 * 60 };
  const staffName = id => ctx.staff.find(x => x.id === id)?.name || 'このスタッフ';
  const resName = id => ctx.resources.find(x => x.id === id)?.name || 'この部屋';
  // シフト管理を使っていない店舗は、シフトの代わりに営業時間で見ない（お店の判断で時間外にも入れられる）
  const staffFree = id => (!ctx.shift || staffWorking(ctx, id, date, s, e, win)) && !clash((ctx.busy.staff[id] || {})[date]);

  // 同じお客様の重なる予約
  const sameName = String(userName || '').trim(), sameContact = String(userContact || '').trim();
  const mine = others(ctx.busy.all[date]).find(iv => overlap(s, e, iv.s, iv.e) && ((userId && iv.user_id === userId) || (!userId && sameName && sameContact && iv.name === sameName && iv.contact === sameContact)));
  if (mine) return { ok: false, error: `このお客様は ${hhmm(mine.s)}〜${hhmm(mine.e)} に別の予約があります` };

  // 担当スタッフ
  let pickStaff = staffId || null;
  if (staffId) {
    if (ctx.shift && !staffWorking(ctx, staffId, date, s, e, win)) return { ok: false, error: `${staffName(staffId)}さんは、この時間シフトに入っていません。シフトを入れるか、別のスタッフを選んでください` };
    const c = clash((ctx.busy.staff[staffId] || {})[date]);
    if (c) return { ok: false, error: `${staffName(staffId)}さんは ${hhmm(c.s)}〜${hhmm(c.e)} に別の予約・レッスン・休憩が入っています` };
    if (service && (service.staff_ids || []).length && !service.staff_ids.includes(staffId)) return { ok: false, error: `${staffName(staffId)}さんは「${service.name}」の担当ではありません` };
  } else if (needStaff) {
    const eligible = ctx.staff.filter(x => x.bookable !== false && (!(service?.staff_ids || []).length || service.staff_ids.includes(x.id)));
    const free = eligible.filter(x => staffFree(x.id));
    if (!free.length) return { ok: false, error: ctx.shift ? 'この時間にシフトに入っていて空いているスタッフがいません' : 'この時間に空いているスタッフがいません' };
    const load = id => ((ctx.busy.staff[id] || {})[date] || []).length;
    pickStaff = free.sort((a, b) => load(a.id) - load(b.id))[0].id;
  }

  // 部屋
  const allowed = ctx.resources.filter(r => !(service?.resource_ids || []).length || service.resource_ids.includes(r.id));
  let pickRes = resourceId || null;
  if (resourceId) {
    if (!ctx.resources.some(r => r.id === resourceId)) return { ok: false, error: '部屋が見つかりません' };
    if (!allowed.some(r => r.id === resourceId)) return { ok: false, error: `「${service.name}」は${resName(resourceId)}では受けられません（メニューで使える部屋：${allowed.map(r => r.name).join('、') || 'なし'}）` };
    const c = clash((ctx.busy.resource[resourceId] || {})[date]);
    if (c) return { ok: false, error: `${resName(resourceId)}は ${hhmm(c.s)}〜${hhmm(c.e)} に別の予約・レッスンで使っています` };
  } else if (needRes && ctx.resources.length) {
    const free = allowed.filter(r => !clash((ctx.busy.resource[r.id] || {})[date]));
    if (!free.length) return { ok: false, error: service && (service.resource_ids || []).length ? `「${service.name}」で使える部屋が、この時間すべて埋まっています` : 'この時間に空いている部屋がありません' };
    pickRes = free[0].id;
  }
  return { ok: true, staffId: pickStaff, resourceId: pickRes };
}

export function addMinutes(hhmmStr, min) {
  const t = toMin(hhmmStr) + min;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
