// シフトの読み書き（2026-10-27：「期間」をやめ、お店＋日付で持つ。確定も日付ごと）。
// シフトのコマ＝provider_shift_entries（provider_id・date）、確定した日＝provider_shift_confirmed_days。

export function datesBetween(from, to) {
  const out = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end && out.length < 400) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
  return out;
}

// 画面から届いた日付の一覧（dates）か範囲（from・to）を、重複なしの日付の配列にする（最大400日）
export function normalizeDates(body) {
  const ok = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
  if (Array.isArray(body?.dates)) return [...new Set(body.dates.filter(ok))].sort().slice(0, 400);
  if (ok(body?.from) && ok(body?.to) && body.from <= body.to) return datesBetween(body.from, body.to);
  return [];
}

export async function confirmedDaysIn(supabase, providerId, from, to) {
  const { data } = await supabase.from('provider_shift_confirmed_days').select('date').eq('provider_id', providerId).gte('date', from).lte('date', to);
  return new Set((data || []).map(r => r.date));
}

export async function entriesIn(supabase, providerId, from, to, cols = 'id, staff_id, date, start_time, end_time, source') {
  const { data } = await supabase.from('provider_shift_entries').select(cols).eq('provider_id', providerId).gte('date', from).lte('date', to).order('date');
  return data || [];
}

// 確定した日のシフトだけ（予約の空き時間・勤怠で使う）
export async function confirmedEntriesIn(supabase, providerId, from, to) {
  const [days, entries] = await Promise.all([confirmedDaysIn(supabase, providerId, from, to), entriesIn(supabase, providerId, from, to, 'staff_id, date, start_time, end_time')]);
  return { days, entries: entries.filter(e => days.has(e.date)) };
}
