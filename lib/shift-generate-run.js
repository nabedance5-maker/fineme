// シフトの自動作成（選んだ日のうち確定していない日を作り直す。手で入れたシフトは残す）。
// 管理画面の「自動で作る」（/api/provider/shift-range action=generate）と、
// 「◯日前になったら自動で確定」の毎朝の処理（/api/cron/shift-auto-confirm）の両方から使う（2026-10-30）。
import { generateShift } from './shift-generator.js';
import { buildAvailability } from './shift-implied-requests.js';
import { buildHabitWindows, historyRange, usualMinutesOf } from './shift-habits.js';
import { loadConditions, loadNeighborEntries } from './shift-labor-db.js';
import { confirmedDaysIn, entriesIn } from './shift-store.js';
import { toMin, fromMin } from './time-span.js';

// 開店前の準備・閉店後の片付けの分だけ、営業時間を前後に広げた「シフトを入れてよい時間」（2026-10-30）。
// 予約を受ける時間は営業時間のまま（lib/availability-engine.js）。閉店後が0時を越える時は翌日の時刻になる
export function widenHours(businessHours, beforeMin = 0, afterMin = 0) {
  if (!beforeMin && !afterMin) return businessHours;
  return Object.fromEntries(Object.entries(businessHours || {}).map(([k, h]) => {
    if (!h || h.closed || !h.open || !h.close) return [k, h];
    const o = Math.max(0, toMin(h.open) - beforeMin);
    let c = toMin(h.close); if (c <= toMin(h.open)) c += 1440;
    return [k, { ...h, open: fromMin(o), close: fromMin((c + afterMin) % 1440) }];
  }));
}

// 戻り値：{ ok, createdCount, warnings, skipped, skippedConfirmed } または { error, status }
export async function runShiftGenerate(supabase, pid, dates) {
  const from = dates[0], to = dates[dates.length - 1];
  const confirmed = await confirmedDaysIn(supabase, pid, from, to);
  const targetDates = dates.filter(d => !confirmed.has(d));
  if (!targetDates.length) return { error: '選んだ日はすべて確定済みです。作り直す時は、先に確定を取り消してください', status: 400 };
  const target = new Set(targetDates);
  const tFrom = targetDates[0], tTo = targetDates[targetDates.length - 1];
  const period = { id: null, period_start: tFrom, period_end: tTo };
  const [{ data: settings }, { data: rawRequests }, conditions, neighborEntries, existing] = await Promise.all([
    supabase.from('provider_shift_settings').select('rule_type, request_format, prep_before_min, cleanup_after_min').eq('provider_id', pid).maybeSingle(),
    supabase.from('provider_shift_requests').select('staff_id, date, type, start_time, end_time').eq('provider_id', pid).gte('date', tFrom).lte('date', tTo),
    loadConditions(supabase, pid),
    loadNeighborEntries(supabase, pid, targetDates),
    entriesIn(supabase, pid, tFrom, tTo),
  ]);
  const own = existing.filter(e => target.has(e.date));
  const [{ data: priorities }, { data: dayPatternRows }, { data: patternRows }, { data: leaves }] = await Promise.all([
    supabase.from('provider_shift_priorities').select('staff_id, priority_score').eq('provider_id', pid),
    supabase.from('provider_shift_day_patterns').select('date, pattern_id').eq('provider_id', pid).gte('date', tFrom).lte('date', tTo),
    supabase.from('provider_shift_patterns').select('id, slots').eq('provider_id', pid),
    supabase.from('provider_paid_leave_requests').select('staff_id, date, unit').eq('provider_id', pid).eq('status', 'approved').gte('date', tFrom).lte('date', tTo),
  ]);
  const leaveKeys = new Set((leaves || []).filter(l => l.unit === 'full').map(l => `${l.staff_id}|${l.date}`));
  const requests = [
    ...(rawRequests || []).filter(r => !leaveKeys.has(`${r.staff_id}|${r.date}`)),
    ...[...leaveKeys].map(k => { const [staff_id, date] = k.split('|'); return { staff_id, date, type: 'off', start_time: null, end_time: null }; }),
  ];
  const dayPatterns = Object.fromEntries((dayPatternRows || []).map(r => [r.date, r.pattern_id]));
  const patternsById = Object.fromEntries((patternRows || []).map(p => [p.id, p]));

  // 出勤希望を出していないスタッフ（休み希望だけ・何も出していない）も対象にする（2026-10-30）。
  // 必要人数のパターンで作る時は、営業時間の中なら入れてよい人として候補に入れる。
  // 希望をもとに作る時は、本人のいつもの働き方（過去8週）とチームの手薄な日から、入れてよい日と時間帯を決める
  const hist = historyRange(tFrom);
  const [{ data: staffRows }, { data: prov }, { data: closedRows }, pastEntries] = await Promise.all([
    supabase.from('provider_staff').select('id').eq('provider_id', pid),
    supabase.from('providers').select('business_hours').eq('id', pid).single(),
    supabase.from('provider_closed_dates').select('date').eq('provider_id', pid).gte('date', tFrom).lte('date', tTo),
    entriesIn(supabase, pid, hist.from, hist.to, 'staff_id, date, start_time, end_time'),
  ]);
  const shiftHours = widenHours(prov?.business_hours, settings?.prep_before_min || 0, settings?.cleanup_after_min || 0);
  const workStaff = new Set(requests.filter(r => r.type === 'work' && target.has(r.date)).map(r => r.staff_id));
  const noRequestStaff = (staffRows || []).filter(st => !workStaff.has(st.id));
  const offKeys = new Set(requests.filter(r => r.type === 'off').map(r => `${r.staff_id}|${r.date}`));
  const closedDates = (closedRows || []).map(c => c.date);
  let availability, habitNotes = [];
  if ((settings?.rule_type || 'as_requested') === 'staffing_target') {
    availability = buildAvailability({ period, requests, submittedStaffIds: noRequestStaff.map(st => st.id), businessHours: shiftHours, closedDates });
  } else {
    const built = buildHabitWindows({
      dates: targetDates, staff: noRequestStaff, conditions, pastEntries, businessHours: shiftHours, closedDates, offKeys, priorities,
      busyDates: [...requests.filter(r => r.type === 'work' && target.has(r.date)).map(r => r.date), ...own.filter(e => e.source === 'manual').map(e => e.date)],
    });
    availability = built.windows;
    habitNotes = built.notes;
  }
  // 選んでいない日・確定した日のコマは「すでにあるもの」として労働時間の計算に入れる
  const keep = existing.filter(e => !target.has(e.date) || e.source === 'manual');
  const { entries, warnings, skipped } = generateShift({
    period, requests, availability, ruleType: settings?.rule_type || 'as_requested', dayPatterns, patternsById,
    priorities: priorities || [], conditions, existingEntries: [...neighborEntries, ...keep], usualMinutes: usualMinutesOf(pastEntries),
  });
  const autoIds = own.filter(e => e.source === 'auto').map(e => e.id);
  if (autoIds.length) { const { error } = await supabase.from('provider_shift_entries').delete().in('id', autoIds); if (error) return { error: error.message, status: 500 }; }
  const rows = entries.filter(e => target.has(e.date)).map(e => ({ ...e, provider_id: pid, period_id: null, source: 'auto' }));
  if (rows.length) { const { error } = await supabase.from('provider_shift_entries').insert(rows); if (error) return { error: error.message, status: 500 }; }
  return { ok: true, createdCount: rows.length, warnings, skipped: [...skipped, ...habitNotes], skippedConfirmed: dates.length - targetDates.length };
}
