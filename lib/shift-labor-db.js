import { weekKey } from './shift-labor.js';

function monthBounds(date) {
  const [y, m] = date.split('-').map(Number);
  return { start: `${y}-${String(m).padStart(2, '0')}-01`, end: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) };
}

// 週・月の上限は期間の外にまたがるため、期間前後の他期間のコマも集める（自期間を除く）
export async function loadNeighborEntries(supabase, providerId, period) {
  const ws = weekKey(period.period_start);
  const we = new Date(new Date(weekKey(period.period_end) + 'T00:00:00Z').getTime() + 6 * 86400000).toISOString().slice(0, 10);
  const from = [ws, monthBounds(period.period_start).start].sort()[0];
  const to = [we, monthBounds(period.period_end).end].sort().reverse()[0];
  const { data: periods } = await supabase.from('provider_shift_periods').select('id').eq('provider_id', providerId).neq('id', period.id);
  const ids = (periods || []).map(p => p.id);
  if (!ids.length) return [];
  const { data } = await supabase.from('provider_shift_entries').select('staff_id, date, start_time, end_time').in('period_id', ids).gte('date', from).lte('date', to);
  return data || [];
}

export async function loadConditions(supabase, providerId) {
  const { data } = await supabase.from('provider_shift_staff_conditions').select('*').eq('provider_id', providerId);
  return data || [];
}
