// GET /api/provider/shift-requests?periodId=X → 店舗側が見る、作るシフトの期間内の全スタッフの希望一覧
//     /api/provider/shift-requests?from=&to= → 日付範囲の希望一覧（月カレンダー・期間を作る前の確認用）
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
  let from = searchParams.get('from');
  let to = searchParams.get('to');

  // 希望は期間に紐づけず日付で持つ（でお指摘 2026-10-16）。periodId の時は、その期間の日付範囲で返す
  if (periodId) {
    const { data: period } = await supabase.from('provider_shift_periods').select('id, period_start, period_end').eq('id', periodId).eq('provider_id', provider.id).single();
    if (!period) return Response.json({ error: '期間が見つかりません' }, { status: 404 });
    from = period.period_start; to = period.period_end;
  }
  if (!from || !to) return Response.json({ error: 'periodId、またはfrom/toは必須です' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_shift_requests')
    .select('id, staff_id, date, type, start_time, end_time, note')
    .eq('provider_id', provider.id)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}
