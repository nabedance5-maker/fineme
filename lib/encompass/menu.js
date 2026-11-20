// メニューの形・URLへの詰め方・条件からの提案（決まりごとで作る。同じ条件なら同じ結果）。
// メニューはURL（?m=）に入れて共有する。年齢・体重などお客様の情報はURLにもサーバーにも載せない。
//
// 1種目の形：{ id, sets, reps, sec, rest, level }
//   reps … 1セットの回数（回数で数える種目）。null なら sec 秒で数える（跳ぶ動きなど）
//   rest … セットの間の休憩（秒）
//   level … [下, 上] のレベル（傾斜）の目安。null なら表示しない

import { EXERCISES, EXERCISE_BY_ID, PARTS } from './exercises';
import { MAX_LEVEL, MAX_USER_CM, MAX_USER_KG, MIN_LEVEL } from './resistance';

export const LIMITS = { items: 40, title: 40, sets: [1, 6], reps: [1, 50], sec: [10, 180], rest: [10, 120] };
export const REST_SEC = 60;      // セットの間の休憩（決めていない時）。渡邉指定 2026-11-20：1分
export const CHANGE_SEC = 20;    // 次の種目への乗り換え・付け替え
export const TEMPO_SEC = 3;      // 1回にかかる時間の目安（時間の見積もり・回数を数える速さ）
export const TEMPOS = [
  { key: 'slow', label: 'ゆっくり', sec: 4 },
  { key: 'normal', label: 'ふつう', sec: 3 },
  { key: 'fast', label: 'はやい', sec: 2 },
];
export const DEFAULT_ITEM = { sets: 3, reps: 10, sec: 30, rest: REST_SEC }; // 渡邉指定 2026-11-20：3セット・休み1分

// 跳ぶ・弾む動きは回数より時間で区切る方が安全（数えている間に勢いがつきすぎない）
export const isTimeExercise = id => (EXERCISE_BY_ID[id]?.load || []).includes('impact');
export const newItem = id => ({ id, ...DEFAULT_ITEM, reps: isTimeExercise(id) ? null : DEFAULT_ITEM.reps, level: null });

const clampInt = (v, [lo, hi], d) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && v !== null && v !== '' ? Math.min(Math.max(n, lo), hi) : d;
};

function cleanLevel(lv) {
  if (!Array.isArray(lv) || lv.length !== 2) return null;
  const a = clampInt(lv[0], [MIN_LEVEL, MAX_LEVEL], null);
  const b = clampInt(lv[1], [MIN_LEVEL, MAX_LEVEL], null);
  return a != null && b != null ? [Math.min(a, b), Math.max(a, b)] : null;
}

// 外から来たメニュー（URL・保存データ・API）を、知っている種目と決めた範囲だけに整える。
// 古い形（[id, sets, sec] / [id, sets, sec, level]）も読める。その時は秒で数える種目になる。
export function sanitizeMenu(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const title = String(raw.t ?? raw.title ?? '').replace(/[\u0000-\u001f]/g, '').slice(0, LIMITS.title);
  const src = Array.isArray(raw.i ?? raw.items) ? (raw.i ?? raw.items) : [];
  const items = [];
  for (const it of src.slice(0, LIMITS.items)) {
    const a = Array.isArray(it);
    const id = a ? it[0] : it?.id;
    if (typeof id !== 'string' || !EXERCISE_BY_ID[id]) continue;
    const sets = clampInt(a ? it[1] : it.sets, LIMITS.sets, DEFAULT_ITEM.sets);
    const sec = clampInt(a ? it[2] : it.sec, LIMITS.sec, DEFAULT_ITEM.sec);
    const level = cleanLevel(a ? it[3] : it.level);
    const rawReps = a ? it[4] : it.reps;
    const reps = rawReps ? clampInt(rawReps, LIMITS.reps, null) : null;
    const rest = clampInt(a ? it[5] : it.rest, LIMITS.rest, REST_SEC);
    items.push({ id, sets, reps, sec, rest, level });
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
  return toB64Url(JSON.stringify({ t: m.title, i: m.items.map(x => [x.id, x.sets, x.sec, x.level || 0, x.reps || 0, x.rest]) }));
}

export function decodeMenu(s) {
  if (typeof s !== 'string' || s.length > 4000) return null;
  try { return sanitizeMenu(JSON.parse(fromB64Url(s))); } catch { return null; }
}

// 1セットにかかる秒数（回数で数える種目は 回数×1回の速さ）
export const workSeconds = (it, tempo = TEMPO_SEC) => (it.reps ? it.reps * tempo : it.sec);

export function itemSeconds(it, tempo = TEMPO_SEC) {
  const rest = it.rest ?? REST_SEC;
  return it.sets * (workSeconds(it, tempo) + rest) - rest + CHANGE_SEC;
}

export function totalMinutes(items, tempo = TEMPO_SEC) {
  return Math.round(items.reduce((s, it) => s + itemSeconds(it, tempo), 0) / 60);
}

// 名前を入れなかった時の名前（例：「脚・お尻と背中のメニュー」）
export function autoTitle(items) {
  const parts = [...new Set(items.map(it => EXERCISE_BY_ID[it.id]?.part).filter(Boolean))];
  if (!parts.length) return 'メニュー';
  if (parts.length >= 4) return '全身のメニュー';
  return `${parts.map(k => PARTS.find(p => p.key === k).label).join('と')}のメニュー`;
}

// 秒を読みやすく：60 → 「1分」、90 → 「1分30秒」、45 → 「45秒」
export function secText(sec) {
  const n = Math.round(Number(sec) || 0);
  if (n < 60) return `${n}秒`;
  const m = Math.floor(n / 60), r = n % 60;
  return r ? `${m}分${r}秒` : `${m}分`;
}

// 「2セット × 10回」「2セット × 30秒」
export const doseText = it => `${it.sets}セット × ${it.reps ? `${it.reps}回` : `${it.sec}秒`}`;

// ---- 条件からの提案 ----
// 目安の決まり（トレーナーが調整する前提。オーナーズガイド「最初は低い傾斜から」に沿う）。
// 50代以降の決まり・性別・BMIの扱いは仮の値。今野くん（トレーナー）の確認で直す（2026-11-20）。
export const EXPERIENCE = [
  { key: 'first', label: 'はじめて', level: [3, 6] },
  { key: 'some', label: '少しある', level: [6, 10] },
  { key: 'used', label: 'よく使う', level: [10, 15] },
];

// 目的：回数・セット・休憩・レベルの上げ下げ・跳ぶ動きを入れるか
export const GOALS = [
  { key: 'health', label: '健康維持', sub: 'むりなく', sets: 3, reps: 10, sec: 30, rest: 60, shift: [0, 0], impact: false },
  { key: 'diet', label: 'ダイエット', sub: '回数を多めに', sets: 3, reps: 15, sec: 30, rest: 20, shift: [-1, -1], impact: true },
  { key: 'strength', label: '筋力アップ', sub: '重めに', sets: 3, reps: 8, sec: 30, rest: 60, shift: [2, 3], impact: false },
  { key: 'hard', label: '追い込み', sub: 'しっかり', sets: 4, reps: 12, sec: 40, rest: 20, shift: [1, 2], impact: true },
];
export const GOAL_LABEL = Object.fromEntries(GOALS.map(g => [g.key, g.label]));

export const GENDERS = [
  { key: 'female', label: '女性' },
  { key: 'male', label: '男性' },
  { key: 'none', label: '答えない' },
];

export const PAINS = [
  { key: 'knee', label: '膝' },
  { key: 'lowBack', label: '腰' },
  { key: 'shoulder', label: '肩' },
];

// よく使う組み合わせ（1回押すだけ）
export const PRESETS = [
  { key: 'lower60', label: '60分 下半身', minutes: 60, parts: ['legs'], goal: 'health' },
  { key: 'hard30', label: '30分 追い込み', minutes: 30, parts: [], goal: 'hard' },
  { key: 'diet30', label: '30分 ダイエット', minutes: 30, parts: [], goal: 'diet' },
  { key: 'health45', label: '45分 健康維持（全身）', minutes: 45, parts: [], goal: 'health' },
  { key: 'upper30', label: '30分 上半身', minutes: 30, parts: ['back', 'chest', 'shoulders', 'arms'], goal: 'health' },
  { key: 'core15', label: '15分 お腹・体幹', minutes: 15, parts: ['core'], goal: 'health' },
];

const UPPER = ['back', 'chest', 'shoulders', 'arms'];

export function bmiOf(heightCm, weightKg) {
  if (!(heightCm >= 100 && heightCm <= 230 && weightKg >= 20 && weightKg <= 300)) return null;
  return Math.round((weightKg / ((heightCm / 100) ** 2)) * 10) / 10;
}

export function suggestMenu({ minutes = 30, parts = [], goal = 'health', experience = 'first', age, gender = 'none', heightCm, weightKg, pains = [] }) {
  const exp = EXPERIENCE.find(e => e.key === experience) || EXPERIENCE[0];
  const g = GOALS.find(x => x.key === goal) || GOALS[0];
  const warnings = [];
  const stop = [];
  const reasons = []; // レベル・回数をこう決めた理由（画面に出す）

  if (heightCm > MAX_USER_CM) stop.push(`身長が${MAX_USER_CM}cmより高い方は、このマシンを使えません。`);
  if (weightKg > MAX_USER_KG) stop.push(`体重が${MAX_USER_KG}kgより重い方は、このマシンを使えません。`);
  const bmi = bmiOf(heightCm, weightKg);

  // レベル：慣れ → 目的で上下 → 年齢・BMIで上限
  let [lo, hi] = exp.level;
  reasons.push(`マシンを使ったことが「${exp.label}」なので、レベル${lo}〜${hi}にしました。`);
  if (g.shift[0] || g.shift[1]) {
    lo += g.shift[0]; hi += g.shift[1];
    reasons.push(`「${g.label}」なので、レベルを少し${g.shift[1] > 0 ? '上げ' : '下げ'}ました。`);
  }
  // 上限は、実際にレベルが下がる時だけ理由に出す
  const capBy = (c, why) => { if (hi > c) { hi = c; reasons.push(`${why}レベルは${c}までにしました。`); } };
  if (age >= 75) capBy(6, '75歳以上なので、');
  else if (age >= 65) capBy(8, '65歳以上なので、');
  else if (age >= 50) capBy(12, '50歳以上なので、');
  if (bmi != null && bmi >= 30) capBy(8, `BMIが${bmi}なので、ひざや腰を守るため、`);
  else if (bmi != null && bmi < 18.5) capBy(8, `やせ型（BMI ${bmi}）なので、`);
  lo = Math.max(MIN_LEVEL, Math.min(lo, hi - 2));
  hi = Math.max(hi, lo);
  if (age > 0 && age < 16) warnings.push('お子さんは、大人とトレーナーがついて行ってください。');

  // 性別：上半身の種目だけ少し下げる（同じ体重でも上半身の力の差が出やすいため。脚・体幹は変えない）
  const upperDown = gender === 'female' ? 2 : 0;

  // 回数・セット：目的で決め、初めての方は控えめに
  let sets = g.sets;
  let reps = g.reps;
  if (experience === 'first') { sets = Math.min(sets, 3); reps = Math.min(reps, 12); }
  if (age >= 65) { sets = Math.min(sets, 3); }
  reasons.push(`「${g.label}」なので、${sets}セット×${reps}回、休み${secText(g.rest)}にしました。`);

  // 跳ぶ動き：目的が許していて、初めてでなく、60歳未満・痛みなし・BMI30未満の時だけ
  const noImpact = !g.impact || experience === 'first' || age >= 60 || pains.length > 0 || (bmi != null && bmi >= 30);
  if (g.impact && noImpact) reasons.push('ジャンプする種目は入れていません。');
  if (pains.length) warnings.push('痛い所に負担がかかる種目は外しました。痛くなったらすぐやめて、トレーナーに伝えてください。');

  const partKeys = parts.length ? parts.filter(p => PARTS.some(x => x.key === p)) : PARTS.map(p => p.key);
  const pool = EXERCISES.filter(e =>
    partKeys.includes(e.part) &&
    !(noImpact && e.load.includes('impact')) &&
    !e.load.some(l => pains.includes(l))
  );

  const itemFor = (e, st) => {
    const down = UPPER.includes(e.part) ? upperDown : 0;
    const a = Math.max(MIN_LEVEL, lo - down);
    const b = Math.max(a, hi - down);
    const time = e.load.includes('impact');
    return { id: e.id, sets: st, reps: time ? null : reps, sec: g.sec, rest: g.rest, level: [a, b] };
  };

  const targetSec = Math.min(Math.max(minutes, 5), 90) * 60;
  const per = itemSeconds({ sets, reps, sec: g.sec, rest: g.rest });
  const want = Math.max(1, Math.floor(targetSec / per));

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

  // 種目が足りない時は、まずセットを増やし（goal のセット+1 まで・最大5）、それでも短ければ同じ流れをもう1周する
  const secOf = (list, st) => list.reduce((t, e) => t + itemSeconds(itemFor(e, st)), 0);
  const maxSets = experience === 'first' || age >= 65 ? Math.max(sets, 3) : Math.min(5, Math.max(sets + 1, 4));
  let st = sets;
  while (picked.length && st < maxSets && secOf(picked, st + 1) <= targetSec) st++;
  let list = picked;
  while (picked.length && list.length + picked.length <= LIMITS.items && secOf(list.concat(picked), st) <= targetSec) list = list.concat(picked);
  const items = list.map(e => itemFor(e, st));
  if (picked.length < want && list.length === picked.length && st === sets) {
    warnings.push(`合う種目が${picked.length}つしかないので、予定より短くなりました。`);
  }
  if (!pool.length) warnings.push('合う種目がありません。きたえる場所か、痛い所の選び方を変えてください。');
  if (upperDown && picked.some(e => UPPER.includes(e.part))) reasons.push('上半身の種目は、レベルを2つ下げました（脚とお腹はそのまま）。');
  if (st !== sets) reasons.push(`時間に合わせて、${st}セットにしました。`);

  const where = parts.length ? partKeys.map(k => PARTS.find(p => p.key === k).label).join('と') : '全身';
  const title = `${minutes}分・${where}・${g.label}`.slice(0, LIMITS.title);
  return {
    menu: { title, items: stop.length ? [] : items },
    warnings,
    stop,
    reasons,
    bmi,
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

// replace … 前に保存した時の印（直してから保存し直した時は、前のものと入れ替えて2つにしない）
export function saveMenu(menu, replace) {
  const m = encodeMenu(menu);
  const list = loadSaved().filter(x => x.m !== m && x.m !== replace);
  list.unshift({ m, title: sanitizeMenu(menu).title || '名前なし', savedAt: Date.now() });
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(list.slice(0, 50))); } catch {}
  return m;
}

export function removeSaved(m) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(loadSaved().filter(x => x.m !== m))); } catch {}
}
