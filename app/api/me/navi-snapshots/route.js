// GET /api/me/navi-snapshots
// ユーザーの月次 Map スナップショット一覧（新しい順・最大12ヶ月）を返す
import { getSupabase } from '@/lib/supabase';
import { ensureMonthlySnapshots } from '@/lib/navi-snapshot-backfill';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try { await ensureMonthlySnapshots(user.id); } catch (e) { console.warn('ensureMonthlySnapshots failed (non-fatal):', e); }

  const { data, error } = await supabase
    .from('navi_snapshots')
    .select('year_month, created_at, navi_steps, axis_progress, step_outcomes, mirror_analysis')
    .eq('user_id', user.id)
    .order('year_month', { ascending: false })
    .limit(12);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ snapshots: data || [] });
}
