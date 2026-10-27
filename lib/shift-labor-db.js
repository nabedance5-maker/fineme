import { weekKey } from './shift-labor.js';

function monthBounds(date) {
  const [y, m] = date.split('-').map(Number);
  return { start: `${y}-${String(m).padStart(2, '0')}-01`, end: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) };
}

// 週・月の上限は対象の日の外にまたがるため、前後の同じ週・同じ月のコマも集める（対象の日そのものは除く）。
// 2026-10-27：期間をやめたため、対象は「日付の集まり」（dates）で受け取る
export async function loadNeighborEntries(supabase, providerId, dates) {
  const sorted = [...dates].sort();
  if (!sorted.length) return [];
  const first = sorted[0], last = sorted[sorted.length - 1];
  const ws = weekKey(first);
  const we = new Date(new Date(weekKey(last) + 'T00:00:00Z').getTime() + 6 * 86400000).toISOString().slice(0, 10);
  const from = [ws, monthBounds(first).start].sort()[0];
  const to = [we, monthBounds(last).end].sort().reverse()[0];
  const own = new Set(sorted);
  const { data } = await supabase.from('provider_shift_entries').select('staff_id, date, start_time, end_time').eq('provider_id', providerId).gte('date', from).lte('date', to);
  return (data || []).filter(e => !own.has(e.date));
}

export async function loadConditions(supabase, providerId) {
  const { data } = await supabase.from('provider_shift_staff_conditions').select('*').eq('provider_id', providerId);
  return data || [];
}
