// GET /api/provider/attendance/paid-leave → スタッフごとの有給（付与・取得・残り・年5日の取得義務）と申請の一覧
export const dynamic = 'force-dynamic';
import { providerFromRequest } from '@/lib/attendance-auth';
import { leaveSummary } from '@/lib/paid-leave';

const jstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export async function GET(request) {
  const { db, provider, error } = await providerFromRequest(request);
  if (error) return error;
  const [{ data: staff }, { data: grants }, { data: requests }] = await Promise.all([
    db.from('provider_staff').select('id, name').eq('provider_id', provider.id).order('sort_order', { ascending: true }),
    db.from('provider_paid_leave_grants').select('id, staff_id, granted_on, expires_on, days, note, created_by, created_at').eq('provider_id', provider.id).order('granted_on', { ascending: false }),
    db.from('provider_paid_leave_requests').select('id, staff_id, date, unit, days, reason, status, decided_at, decided_by, decision_note, created_at').eq('provider_id', provider.id).order('date', { ascending: false }).limit(1000),
  ]);
  const today = jstToday();
  const list = (staff || []).map(s => ({
    id: s.id, name: s.name,
    summary: leaveSummary((grants || []).filter(g => g.staff_id === s.id), (requests || []).filter(r => r.staff_id === s.id), today),
  }));
  return Response.json({ staff: list, grants: grants || [], requests: (requests || []).filter(r => r.status === 'pending' || r.date >= new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10)), today });
}
