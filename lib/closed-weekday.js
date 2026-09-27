// 定休日（毎週固定の曜日休み）判定。lib/slot-generator.jsのgenerateSlotsForDate()と
// 同じ基準（closed:true・open/close未設定は休みとみなす）をAPI側の最終確認でも使う
// （でお確認2026-09-28：「指名なしとか、トレーニングの枠って営業しない日なら確実に
// 入らないのかな?」——手動で1件だけ追加した枠は自動生成の定休日除外を通らないため、
// app/api/providers/[slug]/availability/route.js と app/api/reservations/route.js の
// 両方で最終確認として使う）。
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function isClosedWeekday(businessHours, dateStr) {
  const weekday = WEEKDAY_KEYS[new Date(dateStr + 'T00:00:00Z').getUTCDay()];
  const hours = (businessHours || {})[weekday];
  return !hours || hours.closed || !hours.open || !hours.close;
}
