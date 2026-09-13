// GET  /api/provider/shift-periods → 自店舗のシフト募集期間一覧（新しい順）
// POST /api/provider/shift-periods → 新しい期間を作成（対象月・締切）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('provider_shift_periods')
    .select('*')
    .eq('provider_id', provider.id)
    .order('period_start', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data || []);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { period_start, period_end, request_deadline } = body;
  if (!period_start || !period_end) {
    return Response.json({ error: '対象期間（開始日・終了日）は必須です' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('provider_shift_periods')
    .insert({ provider_id: provider.id, period_start, period_end, request_deadline: request_deadline || null })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}
