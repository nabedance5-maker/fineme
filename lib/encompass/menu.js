// メニューの形・URLへの詰め方・条件からの提案（決まりごとで作る。同じ条件なら同じ結果）。
// メニューはURL（?m=）に入れて共有する。年齢・体重などお客様の情報はURLにもサーバーにも載せない。

import { EXERCISES, EXERCISE_BY_ID, PARTS } from './exercises';
import { MAX_LEVEL, MAX_USER_CM, MAX_USER_KG, MIN_LEVEL } from './resistance';

export const LIMITS = { items: 40, title: 40, sets: [1, 5], sec: [10, 180] };
export const REST_SEC = 30;      // セットの間の休憩
export const CHANGE_SEC = 20;    // 次の種目への乗り換え・付け替え
export const DEFAULT_ITEM = { sets: 2, sec: 45 };

const clampInt = (v, [lo, hi], d) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(Math.max(n, lo), hi) : d;
};

// 外から来たメニュー（URL・保存データ）を、知っている種目と決めた範囲だけに整える
export function sanitizeMenu(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = String(raw.t ?? raw.title ?? '').replace(/[\u0000-\u001f]/g, '').slice(0, LIMITS.title);
  const src = Array.isArray(raw.i ?? raw.items) ? (raw.i ?? raw.items) : [];
  const items = [];
  for (const it of src.slice(0, LIMITS.items)) {
    const id = Array.isArray(it) ? it[0] : it?.id;
    if (typeof id !== 'string' || !EXERCISE_BY_ID[id]) continue;
    const sets = clampInt(Array.isArray(it) ? it[1] : it.sets, LIMITS.sets, DEFAULT_ITEM.sets);
    const sec = clampInt(Array.isArray(it) ? it[2] : it.sec, LIMITS.sec, DEFAULT_ITEM.sec);
    let lv = Array.isArray(it) ? it[3] : it.level;
    let level = null;
    if (Array.isArray(lv) && lv.length === 2) {
      const a = clampInt(lv[0], [MIN_LEVEL, MAX_LEVEL], null);
      const b = clampInt(lv[1], [MIN_LEVEL, MAX_LEVEL], null);
      if (a != null && b != null) level = [Math.min(a, b), Math.max(a, b)];
    }
    items.push({ id, sets, sec, level });
  }
  return { title, items };
}

function toB64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

export function encodeMenu(menu) {
  const m = sanitizeMenu(menu);
  return toB64Url(JSON.stringify({ t: m.title, i: m.items.map(x => (x.level ? [x.id, x.sets, x.sec, x.level] : [x.id, x.sets, x.sec])) }));
}

export function decodeMenu(s) {
  if (typeof s !== 'string' || s.length > 4000) return null;
  try { return sanitizeMenu(JSON.parse(fromB64Url(s))); } catch { return null; }
}

export function itemSeconds(it) {
  return it.sets * (it.sec + REST_SEC) - REST_SEC + CHANGE_SEC;
}

export function totalMinutes(items) {
  return Math.round(items.reduce((s, it) => s + itemSeconds(it), 0) / 60);
}

// ---- 条件からの提案 ----
// 目安の決まり（トレーナーが調整する前提。オーナーズガイド「最初は低い傾斜から」に沿う）
//   慣れ：初めて 3〜6 / 少し慣れている 6〜10 / 慣れている 10〜15
//   65歳以上は上限8、75歳以上は上限6。初めて・65歳以上・痛みあり は跳ぶ動きを入れない。
export const EXPERIENCE = [
  { key: 'first', label: '初めて', level: [3, 6], sets: 2, sec: 40 },
  { key: 'some', label: '少し慣れている', level: [6, 10], sets: 2, sec: 45 },
  { key: 'used', label: '慣れている', level: [10, 15], sets: 3, sec: 45 },
];

export const PAINS = [
  { key: 'knee', label: '膝' },
  { key: 'lowBack', label: '腰' },
  { key: 'shoulder', label: '肩' },
];

export function suggestMenu({ minutes = 30, parts = [], experience = 'first', age, heightCm, weightKg, pains = [] }) {
  const exp = EXPERIENCE.find(e => e.key === experience) || EXPERIENCE[0];
  const warnings = [];
  const stop = [];

  if (heightCm > MAX_USER_CM) stop.push(`身長${MAX_USER_CM}cmを超える方は、この機械の使用制限を超えています。`);
  if (weightKg > MAX_USER_KG) stop.push(`体重${MAX_USER_KG}kgを超える方は、この機械の使用制限を超えています。`);

  let [lo, hi] = exp.level;
  if (age >= 75) { hi = Math.min(hi, 6); lo = Math.min(lo, 3); warnings.push('75歳以上のため、低いレベルに抑えています。'); }
  else if (age >= 65) { hi = Math.min(hi, 8); lo = Math.min(lo, 4); warnings.push('65歳以上のため、レベルの上限を8にしています。'); }
  if (lo > hi) lo = hi;
  if (age > 0 && age < 16) warnings.push('お子様は必ず大人が付き添い、トレーナーの指導のもとで行ってください。');

  const noImpact = experience === 'first' || age >= 65 || pains.length > 0;
  if (pains.length) warnings.push('痛みのある所に負担がかかりやすい種目を外しています。痛みが出たらすぐ止めて、トレーナーに相談してください。');

  const partKeys = parts.length ? parts.filter(p => PARTS.some(x => x.key === p)) : PARTS.map(p => p.key);
  const pool = EXERCISES.filter(e =>
    partKeys.includes(e.part) &&
    !(noImpact && e.load.includes('impact')) &&
    !e.load.some(l => pains.includes(l))
  );

  const base = { sets: exp.sets, sec: exp.sec, level: [lo, hi] };
  const per = itemSeconds(base);
  const want = Math.max(1, Math.floor((Math.min(Math.max(minutes, 5), 90) * 60) / per));

  // 部位を順番に回して選ぶ（カタログの順＝基本の種目が先）
  const byPart = partKeys.map(k => pool.filter(e => e.part === k));
  const picked = [];
  for (let round = 0; picked.length < want; round++) {
    let added = false;
    for (const list of byPart) {
      if (picked.length >= want) break;
      if (list[round]) { picked.push(list[round]); added = true; }
    }
    if (!added) break;
  }
  // 同じ部位を続けて並べ、乗り換えを減らす
  picked.sort((a, b) => partKeys.indexOf(a.part) - partKeys.indexOf(b.part));

  // 種目が足りない時は、まずセットを増やし（4セットまで）、それでも短ければ同じ流れをもう1周する
  const targetSec = Math.min(Math.max(minutes, 5), 90) * 60;
  let sets = base.sets;
  const secOf = (n, st) => n * itemSeconds({ ...base, sets: st });
  while (picked.length && sets < 4 && secOf(picked.length, sets + 1) <= targetSec) sets++;
  let items = picked.map(e => ({ id: e.id, ...base, sets }));
  const round = items;
  while (round.length && items.length + round.length <= LIMITS.items && secOf(items.length + round.length, sets) <= targetSec) items = items.concat(round);
  if (picked.length < want && items.length === picked.length && sets === base.sets) {
    warnings.push(`条件に合う種目が${picked.length}種目しかないため、予定より短いメニューです。`);
  }
  if (!pool.length) warnings.push('条件に合う種目がありません。部位か痛みの選び方を変えてください。');

  const title = `${minutes}分・${parts.length ? partKeys.map(k => PARTS.find(p => p.key === k).label).join('と') : '全身'}`.slice(0, LIMITS.title);
  return {
    menu: { title, items: stop.length ? [] : items },
    warnings,
    stop,
  };
}

// ---- 端末に保存したメニュー（このタブレットだけ） ----
const SAVE_KEY = 'encompass:menus';

export function loadSaved() {
  try {
    const arr = JSON.parse(localStorage.getItem(SAVE_KEY) || '[]');
    return Array.isArray(arr) ? arr.filter(x => typeof x?.m === 'string').slice(0, 50) : [];
  } catch { return []; }
}

export function saveMenu(menu) {
  const m = encodeMenu(menu);
  const list = loadSaved().filter(x => x.m !== m);
  list.unshift({ m, title: sanitizeMenu(menu).title || '名前なし', savedAt: Date.now() });
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(list.slice(0, 50))); } catch {}
  return m;
}

export function removeSaved(m) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(loadSaved().filter(x => x.m !== m))); } catch {}
}
