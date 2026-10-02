// GET /api/provider/shift-periods/[id]/labor-check → この期間のシフトが各スタッフの労働条件
// （法定の目安を含む）を超えていないかを洗い出す。確定前の確認用（保存はしない）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { effectiveLimits, evaluateLabor } from '@/lib/shift-labor';
import { loadConditions, loadNeighborEntries } from '@/lib/shift-labor-db';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data: period } = await supabase.from('provider_shift_periods').select('*').eq('id', id).eq('provider_id', provider.id).single();
  if (!period) return Response.json({ error: '期間が見つかりません' }, { status: 404 });

  const [{ data: own }, neighbors, conditions, { data: staff }] = await Promise.all([
    supabase.from('provider_shift_entries').select('staff_id, date, start_time, end_time').eq('period_id', period.id),
    loadNeighborEntries(supabase, provider.id, period),
    loadConditions(supabase, provider.id),
    supabase.from('provider_staff').select('id, name').eq('provider_id', provider.id),
  ]);

  const limitsByStaff = {};
  (staff || []).forEach(s => { limitsByStaff[s.id] = effectiveLimits(conditions.find(c => c.staff_id === s.id) || null); });
  const names = Object.fromEntries((staff || []).map(s => [s.id, s.name]));

  const all = [...(own || []), ...neighbors];
  const { violations, stats } = evaluateLabor(all, limitsByStaff, id => names[id] || '(不明)');
  // この期間のコマが絡む違反だけ返す（他期間だけで完結する違反は対象外）
  const mine = new Set((own || []).map(e => `${e.staff_id}|${e.date}`));
  const relevant = violations.filter(v => v.dates.some(d => mine.has(`${v.staff_id}|${d}`)));
  const ownStats = evaluateLabor(own || [], limitsByStaff).stats;

  return Response.json({ violations: relevant, stats: ownStats, allStats: stats });
}
