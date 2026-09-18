// 予約締切の判定（でお要望2026-09-18：「予約締め切りは前日の何時までというのと、
// 予約の何時間前までを選べるように」）。2つのモードを共通ロジックとして1箇所に
// まとめ、公開の空き枠一覧・予約作成の両方から必ずこの関数を経由させることで、
// 「一部の経路だけ直し忘れる」不具合（このセッションで実際に何度か起きた）を防ぐ。
//
// ・hours（既定）：予約開始の◯時間前まで受付
// ・day_before_time：予約日の前日◯時まで受付（固定時刻）

function dateMinusOneDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * @param {{booking_cutoff_mode?: string, booking_cutoff_hours?: number, booking_cutoff_time?: string}} provider
 * @param {string} slotDate - YYYY-MM-DD（日本時間の日付）
 * @param {string} slotStartTime - HH:MM（日本時間の壁時計表記）
 * @returns {boolean} true = 締切を過ぎている（予約不可）
 */
export function isPastBookingCutoff(provider, slotDate, slotStartTime) {
  const mode = provider?.booking_cutoff_mode || 'hours';
  const slotStartMs = new Date(`${slotDate}T${slotStartTime}:00+09:00`).getTime();

  if (mode === 'day_before_time') {
    const cutoffTime = provider?.booking_cutoff_time;
    if (!cutoffTime) return false; // 未設定なら制限なし
    const dayBefore = dateMinusOneDay(slotDate);
    const cutoffMs = new Date(`${dayBefore}T${cutoffTime}:00+09:00`).getTime();
    return Date.now() >= cutoffMs;
  }

  const hours = provider?.booking_cutoff_hours || 0;
  if (!hours) return false;
  return slotStartMs <= Date.now() + hours * 3600000;
}

// エラーメッセージ用の説明文（お客様への表示にも店舗の再確認にも使う）
export function cutoffDescription(provider) {
  const mode = provider?.booking_cutoff_mode || 'hours';
  if (mode === 'day_before_time' && provider?.booking_cutoff_time) {
    return `前日${provider.booking_cutoff_time}まで`;
  }
  if (mode === 'hours' && provider?.booking_cutoff_hours) {
    return `開始${provider.booking_cutoff_hours}時間前まで`;
  }
  return '';
}
