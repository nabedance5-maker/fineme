// 定休日（毎週固定の曜日休み）判定（closed:true・open/close未設定は休みとみなす）。
// 予約できる時間の計算（lib/availability-engine.js）と予約受付の最終確認で使う。
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function isClosedWeekday(businessHours, dateStr) {
  const weekday = WEEKDAY_KEYS[new Date(dateStr + 'T00:00:00Z').getUTCDay()];
  const hours = (businessHours || {})[weekday];
  return !hours || hours.closed || !hours.open || !hours.close;
}
