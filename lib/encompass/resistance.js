// ENCOMPASS の負荷の表（オーナーズガイド p28「RESISTANCE AS % OF BODYWEIGHT (KGS)」をそのまま写したもの）。
// 列＝体重＋追加のおもり（kg）、行＝傾斜レベル1〜22。値＝体重に対する負荷（%）。
// ケーブルを台につなぐ使い方では値が 1/2〜1/4 になる（同 p26）。ここでは台に乗る基本の値だけを扱う。

const WEIGHTS = [50, 60, 70, 80, 100, 120, 150, 180, 240, 295];

// index 0 = レベル1 … index 21 = レベル22
const PCT = [
  [6, 6, 6, 6, 6, 5, 5, 5, 5, 5],
  [9, 9, 9, 8, 8, 8, 8, 8, 7, 7],
  [12, 12, 11, 11, 11, 10, 10, 10, 10, 10],
  [15, 14, 14, 14, 13, 13, 13, 12, 12, 12],
  [18, 17, 17, 16, 16, 15, 15, 15, 14, 14],
  [21, 20, 19, 19, 18, 18, 17, 17, 17, 16],
  [24, 23, 22, 21, 21, 20, 20, 19, 19, 19],
  [26, 25, 25, 24, 23, 23, 22, 22, 21, 21],
  [29, 28, 27, 27, 26, 25, 24, 24, 24, 23],
  [32, 31, 30, 29, 28, 28, 27, 26, 26, 26],
  [35, 34, 33, 32, 31, 30, 29, 29, 28, 28],
  [38, 36, 35, 34, 33, 32, 32, 31, 30, 30],
  [41, 39, 38, 37, 36, 35, 34, 33, 33, 32],
  [44, 42, 41, 40, 38, 37, 36, 36, 35, 35],
  [46, 45, 43, 42, 41, 40, 39, 38, 37, 37],
  [49, 47, 46, 45, 43, 42, 41, 41, 40, 39],
  [52, 50, 49, 47, 46, 45, 44, 43, 42, 42],
  [55, 53, 51, 50, 48, 47, 46, 45, 44, 44],
  [58, 56, 54, 53, 51, 50, 48, 48, 47, 46],
  [61, 58, 57, 55, 53, 52, 51, 50, 49, 48],
  [64, 61, 59, 58, 56, 55, 53, 52, 51, 51],
  [67, 64, 62, 60, 58, 57, 56, 55, 54, 53],
];

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 22;
// 機械の使用制限（オーナーズガイド p13）
export const MAX_USER_KG = 160;
export const MAX_USER_CM = 200;

// 体重に対する負荷（%）。体重が表の間なら近い2列から直線で補う。
export function loadPercent(level, bodyKg = 60) {
  const lv = Math.round(level);
  if (!(lv >= MIN_LEVEL && lv <= MAX_LEVEL)) return null;
  const row = PCT[lv - 1];
  const w = Math.min(Math.max(Number(bodyKg) || 60, WEIGHTS[0]), WEIGHTS[WEIGHTS.length - 1]);
  let i = 0;
  while (i < WEIGHTS.length - 2 && w > WEIGHTS[i + 1]) i++;
  const t = (w - WEIGHTS[i]) / (WEIGHTS[i + 1] - WEIGHTS[i]);
  return row[i] + (row[i + 1] - row[i]) * t;
}

// 体重を入れた時の負荷の目安（kg・整数）
export function loadKg(level, bodyKg) {
  const p = loadPercent(level, bodyKg);
  if (p == null || !(bodyKg > 0)) return null;
  return Math.round((bodyKg * p) / 100);
}

// 画面に出すレベルの目安：「レベル3〜6（約7〜12kg）」。体重が分からない時は「レベル3〜6」だけ
export function levelText(range, bodyKg) {
  if (!range) return '';
  const [a, b] = range;
  const span = (x, y) => (x === y ? `${x}` : `${x}〜${y}`);
  const s = `レベル${span(a, b)}`;
  return bodyKg > 0 ? `${s}（重さ 約${span(loadKg(a, bodyKg), loadKg(b, bodyKg))}kg）` : s;
}
