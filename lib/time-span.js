// 時刻の区間（"HH:MM"〜"HH:MM"）の共通処理。終了が開始以前なら「翌日の時刻」とみなす
// （でお要望2026-10-07：18:00〜27:00(翌3時)のような日付をまたぐ営業時間・シフトに対応）。
export function toMin(t) {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// {s, e} を分で返す。e は s より大きく（翌日なら +1440）
export function spanOf(start, end) {
  const s = toMin(start), e0 = toMin(end);
  if (s === null || e0 === null) return null;
  return { s, e: e0 <= s ? e0 + 1440 : e0 };
}

export function crossesMidnight(start, end) {
  const s = toMin(start), e = toMin(end);
  return s !== null && e !== null && e <= s;
}

// 分（0〜2879）を "HH:MM"（24時間表記、翌日分は0時から）に戻す
export function fromMin(min) {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// 表示用："18:00〜翌3:00"
export function rangeLabel(start, end, sep = '〜') {
  if (!start || !end) return '';
  const a = String(start).slice(0, 5), b = String(end).slice(0, 5);
  return crossesMidnight(a, b) ? `${a}${sep}翌${b.replace(/^0/, '')}` : `${a}${sep}${b}`;
}
