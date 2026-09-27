// シフト外の時間帯を「予約カレンダーでグレー表示するだけ」から「実際に予約を
// 防ぐ」に格上げする（でお報告2026-09-16：「あるスタッフのその人のシフトが
// 入ってない時間帯は自動でブロックされるようにして」。調査の結果、従来は
// 予約カレンダーの見た目のグレー帯だけで、公開予約枠の一覧にも予約作成時にも
// シフト外を除外する仕組みが一切無かった）。
//
// でお要望2026-09-27（今野くんの実地確認「ハコモノの場合、お客様側予約できるのは
// 店側がシフト確定して営業日が確定してから」を受けて）：判定を反転した。
// 従来は「確定済みシフト期間がその日をカバーしていない＝制約なし（予約可能）」の
// フォールバックだったが、これだとシフトが未確定の日ほど無制限に予約できてしまい
// hacomonoの実際の挙動と逆だった。今は「シフトが確定していない日は予約不可」が
// 既定になる。あわせて、従来は判定対象外だった「指名なし」予約も、その日その時間に
// 出勤予定のスタッフが1人もいなければ予約不可にする（でないと指名を外すだけで
// シフト未確定日の制約を回避できてしまう抜け道になるため）。
// この判定はshift_management機能がONの店舗のみ有効（呼び出し元で分岐済み）。
// シフト管理を使っていない店舗の予約には一切影響しない。

function toMinutes(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + m;
}

// 期間[from, to]の確定シフトデータをまとめて取得する。
export async function getShiftScheduleForRange(supabase, providerId, from, to) {
  const { data: periods } = await supabase
    .from('provider_shift_periods')
    .select('id, period_start, period_end')
    .eq('provider_id', providerId)
    .eq('status', 'confirmed')
    .lte('period_start', to)
    .gte('period_end', from);

  const coveredDates = new Set();
  (periods || []).forEach(p => {
    let d = new Date(p.period_start + 'T00:00:00');
    const end = new Date(p.period_end + 'T00:00:00');
    while (d <= end) {
      const ds = d.toISOString().slice(0, 10);
      if (ds >= from && ds <= to) coveredDates.add(ds);
      d.setDate(d.getDate() + 1);
    }
  });

  const periodIds = (periods || []).map(p => p.id);
  const windowsByStaffDate = {};
  if (periodIds.length) {
    const { data: entries } = await supabase
      .from('provider_shift_entries')
      .select('staff_id, date, start_time, end_time')
      .in('period_id', periodIds)
      .gte('date', from)
      .lte('date', to);
    (entries || []).forEach(e => {
      windowsByStaffDate[e.staff_id] = windowsByStaffDate[e.staff_id] || {};
      (windowsByStaffDate[e.staff_id][e.date] = windowsByStaffDate[e.staff_id][e.date] || []).push({ start: e.start_time, end: e.end_time });
    });
  }
  return { coveredDates, windowsByStaffDate };
}

// staffIdのdate・startTime〜endTimeがシフト外かどうか（true=シフト外＝予約不可）。
export function isOutsideShift(schedule, staffId, date, startTime, endTime) {
  // その日の確定シフト自体が無い＝シフト未確定日は予約不可（でお要望2026-09-27）
  if (!schedule.coveredDates.has(date)) return true;

  const sMin = toMinutes(startTime);
  const eMin = toMinutes(endTime);

  if (!staffId) {
    // 指名なし：その時間帯に出勤予定のスタッフが1人でもいれば予約可
    if (sMin === null || eMin === null) return false;
    const anyStaffAvailable = Object.values(schedule.windowsByStaffDate).some(byDate =>
      (byDate[date] || []).some(w => toMinutes(w.start) <= sMin && toMinutes(w.end) >= eMin)
    );
    return !anyStaffAvailable;
  }

  const windows = (schedule.windowsByStaffDate[staffId] && schedule.windowsByStaffDate[staffId][date]) || [];
  if (!windows.length) return true; // 確定シフトはあるがこのスタッフの勤務予定が無い＝出勤していない
  if (sMin === null || eMin === null) return false;
  return !windows.some(w => toMinutes(w.start) <= sMin && toMinutes(w.end) >= eMin);
}
