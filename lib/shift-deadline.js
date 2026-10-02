// 希望シフトの提出締切（request_deadline）はその日の終わりまで。日本時間の「今日」が
// 締切日より後なら締切超過。締切後も未提出のスタッフは遅れて提出できるが、提出を完了した
// 後は変更できない（でお要望2026-10-02）。
export function jstToday() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function isDeadlinePassed(period) {
  return !!period?.request_deadline && period.request_deadline < jstToday();
}

export const LOCKED_MESSAGE = '提出締切を過ぎており、すでに提出済みのため変更できません。変更が必要な場合は店舗に直接連絡してください';

export function daysUntil(dateStr, today = jstToday()) {
  return Math.round((new Date(dateStr + 'T00:00:00Z') - new Date(today + 'T00:00:00Z')) / 86400000);
}

// 通知日数（"1,0" や [1,0]）を 0〜60 の重複なし整数配列に正規化。不正値・未指定は null
export function parseNotifyDays(v) {
  if (v === undefined || v === null) return null;
  const arr = Array.isArray(v) ? v : String(v).split(/[,、\s]+/).filter(Boolean);
  const nums = [...new Set(arr.map(Number))].filter(n => Number.isInteger(n) && n >= 0 && n <= 60);
  return nums.sort((a, b) => b - a);
}
