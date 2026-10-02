// 希望シフトの提出締切（request_deadline）はその日の終わりまで有効。日本時間の「今日」が
// 締切日より後になったら締切超過として扱う。
export function jstToday() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function isDeadlinePassed(period) {
  return !!period?.request_deadline && period.request_deadline < jstToday();
}

export const DEADLINE_CLOSED_MESSAGE = '提出締切を過ぎたため、希望の提出・変更はできません。変更が必要な場合は店舗に直接連絡してください';
