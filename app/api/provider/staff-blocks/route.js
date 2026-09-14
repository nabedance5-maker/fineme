// GET  /api/provider/staff-blocks?from=&to= → 期間内のスタッフ休憩・外出ブロック一覧
// POST /api/provider/staff-blocks → ブロック追加
// でお要望2026-09-14：「スタッフが休憩だったり外出でいない時をブロックできるように」。
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

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  let query = supabase.from('provider_staff_blocks').select('*').eq('provider_id', provider.id).order('date').order('start_time');
  if (from) query = query.gte('date', from);
  if (to) query = query.lte('date', to);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { staff_id, date, start_time, end_time, reason } = body;
  if (!staff_id || !date || !start_time || !end_time) {
    return Response.json({ error: 'スタッフ・日付・時間は必須です' }, { status: 400 });
  }
  if (start_time >= end_time) {
    return Response.json({ error: '終了時刻は開始時刻より後にしてください' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('provider_staff_blocks')
    .insert({ provider_id: provider.id, staff_id, date, start_time, end_time, reason: reason || null })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
