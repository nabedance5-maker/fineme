// GET  /api/provider/shift-entries?periodId=X → 指定期間の確定シフト一覧
// POST /api/provider/shift-entries → 1コマ手動追加
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

async function assertOwnPeriod(providerId, periodId) {
  const { data } = await supabase.from('provider_shift_periods').select('id').eq('id', periodId).eq('provider_id', providerId).single();
  return !!data;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const periodId = searchParams.get('periodId');
  if (!periodId) return Response.json({ error: 'periodIdは必須です' }, { status: 400 });
  if (!(await assertOwnPeriod(provider.id, periodId))) return Response.json({ error: '期間が見つかりません' }, { status: 404 });

  const { data, error } = await supabase
    .from('provider_shift_entries')
    .select('*')
    .eq('period_id', periodId)
    .order('date', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data || []);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { period_id, staff_id, date, start_time, end_time } = body;
  if (!period_id || !staff_id || !date || !start_time || !end_time) {
    return Response.json({ error: '必須項目が不足しています' }, { status: 400 });
  }
  if (!(await assertOwnPeriod(provider.id, period_id))) return Response.json({ error: '期間が見つかりません' }, { status: 404 });

  const { data, error } = await supabase
    .from('provider_shift_entries')
    .insert({ period_id, staff_id, date, start_time, end_time, source: 'manual' })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}
