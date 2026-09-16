// シフト外の時間帯を「予約カレンダーでグレー表示するだけ」から「実際に予約を
// 防ぐ」に格上げする（でお報告2026-09-16：「あるスタッフのその人のシフトが
// 入ってない時間帯は自動でブロックされるようにして」。調査の結果、従来は
// 予約カレンダーの見た目のグレー帯だけで、公開予約枠の一覧にも予約作成時にも
// シフト外を除外する仕組みが一切無かった）。
// ロジックは掲載者ダッシュボードの loadStaffBlocksAndShifts / greyIntervalsFor と
// 同じ考え方：①確定済みシフト期間がその日をカバーしていない場合は判定しない
// （シフト未確定＝制約なしのフォールバック）②カバーしている場合、そのスタッフの
// 確定シフト時間帯に完全に収まらない予約は不可とする。

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
// staffId未指定（指名なし）は判定対象外＝常にfalse。
export function isOutsideShift(schedule, staffId, date, startTime, endTime) {
  if (!staffId) return false;
  if (!schedule.coveredDates.has(date)) return false; // その日の確定シフトが無い＝制約なし
  const windows = (schedule.windowsByStaffDate[staffId] && schedule.windowsByStaffDate[staffId][date]) || [];
  if (!windows.length) return true; // 確定シフトはあるがこのスタッフの勤務予定が無い＝出勤していない
  const sMin = toMinutes(startTime);
  const eMin = toMinutes(endTime);
  if (sMin === null || eMin === null) return false;
  return !windows.some(w => toMinutes(w.start) <= sMin && toMinutes(w.end) >= eMin);
}
