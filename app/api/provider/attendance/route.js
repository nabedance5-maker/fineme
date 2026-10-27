// GET /api/provider/attendance?from=YYYY-MM-DD&to=YYYY-MM-DD → 期間の打刻（取り消し済みも含む）・勤務の集計・確定シフト・承認済みの有給
export const dynamic = 'force-dynamic';
import { confirmedEntriesIn } from '@/lib/shift-store';
import { providerFromRequest } from '@/lib/attendance-auth';
import { buildWorkdays } from '@/lib/attendance';

const JST = 9 * 3600 * 1000;
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

export async function GET(request) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from'), to = searchParams.get('to');
  if (!isDate(from) || !isDate(to) || from > to) return Response.json({ error: '期間の指定が正しくありません' }, { status: 400 });
  // 日付またぎの退勤を拾うため、終了日の翌日の昼まで取る
  const fromIso = new Date(new Date(from + 'T00:00:00Z').getTime() - JST).toISOString();
  const toIso = new Date(new Date(to + 'T00:00:00Z').getTime() - JST + 36 * 3600 * 1000).toISOString();

  const [{ data: staff }, { data: punches, error: pErr }, shiftConf, { data: leaves }] = await Promise.all([
    db.from('provider_staff').select('id, name, attendance_pin_hash').eq('provider_id', provider.id).order('sort_order', { ascending: true }),
    db.from('provider_attendance_punches').select('id, staff_id, kind, punched_at, source, note, created_by, created_at, voided_at, voided_by, void_reason').eq('provider_id', provider.id).gte('punched_at', fromIso).lt('punched_at', toIso).order('punched_at'),
    confirmedEntriesIn(db, provider.id, from, to),
    db.from('provider_paid_leave_requests').select('staff_id, date, unit, days').eq('provider_id', provider.id).eq('status', 'approved').gte('date', from).lte('date', to),
  ]);
  if (pErr) return Response.json({ error: pErr.message }, { status: 500 });
  const shifts = shiftConf?.entries || []; // 確定した日のシフト（2026-10-27：期間をやめた）
  const days = buildWorkdays(punches || [], shifts || []).filter(d => d.date >= from && d.date <= to);
  return Response.json({
    staff: (staff || []).map(s => ({ id: s.id, name: s.name, has_pin: !!s.attendance_pin_hash })),
    punches: punches || [],
    days,
    shifts: shifts || [],
    leaves: leaves || [],
  });
}
