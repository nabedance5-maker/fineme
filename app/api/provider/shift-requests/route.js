// GET /api/provider/shift-requests?periodId=X → 店舗側が見る、指定期間の全スタッフの希望一覧
//     /api/provider/shift-requests?from=&to= → 期間をまたいだ日付範囲の希望一覧（月カレンダー用）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { planLockedResponse } from '@/lib/plan-features';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }

  const { searchParams } = new URL(request.url);
  const periodId = searchParams.get('periodId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!periodId && from && to) {
    const { data: periods } = await supabase
      .from('provider_shift_periods')
      .select('id')
      .eq('provider_id', provider.id)
      .lte('period_start', to)
      .gte('period_end', from);
    const ids = (periods || []).map(p => p.id);
    if (!ids.length) return Response.json([]);
    const { data, error } = await supabase
      .from('provider_shift_requests')
      .select('id, staff_id, date, type, start_time, end_time, note')
      .in('period_id', ids)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data || []);
  }

  if (!periodId) return Response.json({ error: 'periodId、またはfrom/toは必須です' }, { status: 400 });

  // この期間が自店舗のものか確認してから返す（他店舗の期間IDを渡された場合に漏れないように）
  const { data: period } = await supabase.from('provider_shift_periods').select('id, period_start, period_end').eq('id', periodId).eq('provider_id', provider.id).single();
  if (!period) return Response.json({ error: '期間が見つかりません' }, { status: 404 });

  const { data, error } = await supabase
    .from('provider_shift_requests')
    .select('id, staff_id, date, type, start_time, end_time, note')
    .eq('period_id', periodId)
    .order('date', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data || []);
}
