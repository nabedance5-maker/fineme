// 休み希望だけ（または何も希望を出さず）提出したスタッフは「休み以外の日は出勤可」とみなし、
// 営業時間どおりの出勤希望を補う（でお指摘2026-10-02：休み希望のみ集める店舗でも、
// 店側が出勤日を全部手入力しなくて済むように）。定休日・臨時休業日・本人の休み希望日は除く。
import { isClosedWeekday } from './closed-weekday.js';

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const FALLBACK_HOURS = { open: '09:00', close: '18:00' };

function datesInRange(start, end) {
  const dates = [];
  const cur = new Date(start + 'T00:00:00Z');
  const last = new Date(end + 'T00:00:00Z');
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

export function buildImpliedRequests({ period, requests, submittedStaffIds, businessHours, closedDates }) {
  const bh = businessHours || {};
  const hasAnyHours = Object.values(bh).some(h => h && !h.closed && h.open && h.close);
  const closedSet = new Set(closedDates || []);
  const workers = new Set((requests || []).filter(r => r.type === 'work').map(r => r.staff_id));
  const offSet = new Set((requests || []).filter(r => r.type === 'off').map(r => `${r.staff_id}|${r.date}`));
  const out = [];
  [...new Set(submittedStaffIds || [])].filter(id => !workers.has(id)).forEach(staffId => {
    datesInRange(period.period_start, period.period_end).forEach(date => {
      if (offSet.has(`${staffId}|${date}`) || closedSet.has(date)) return;
      let hours;
      if (hasAnyHours) {
        if (isClosedWeekday(bh, date)) return;
        hours = bh[WEEKDAY_KEYS[new Date(date + 'T00:00:00Z').getUTCDay()]];
      } else {
        hours = FALLBACK_HOURS;
      }
      out.push({ staff_id: staffId, date, type: 'work', start_time: String(hours.open).slice(0, 5), end_time: String(hours.close).slice(0, 5), implied: true });
    });
  });
  return out;
}

export async function loadImpliedRequests(supabase, providerId, period, requests) {
  const [{ data: subs }, { data: prov }, { data: closed }] = await Promise.all([
    supabase.from('provider_shift_submissions').select('staff_id').eq('period_id', period.id),
    supabase.from('providers').select('business_hours').eq('id', providerId).single(),
    supabase.from('provider_closed_dates').select('date').eq('provider_id', providerId).gte('date', period.period_start).lte('date', period.period_end),
  ]);
  return buildImpliedRequests({
    period,
    requests,
    submittedStaffIds: (subs || []).map(s => s.staff_id),
    businessHours: prov?.business_hours,
    closedDates: (closed || []).map(c => c.date),
  });
}
