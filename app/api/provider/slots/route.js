// GET  /api/provider/slots?month=YYYY-MM  → 月別スロット一覧
// POST /api/provider/slots                → スロット追加（単発 or 一括）
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(token);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // YYYY-MM

  let query = supabase
    .from('provider_slots')
    .select('*')
    .eq('provider_id', provider.id)
    .order('date')
    .order('start_time');

  if (month) {
    const [y, m] = month.split('-').map(Number);
    const from = `${y}-${String(m).padStart(2,'0')}-01`;
    const to   = `${y}-${String(m).padStart(2,'0')}-${new Date(y, m, 0).getDate()}`;
    query = query.gte('date', from).lte('date', to);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(token);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  // 一括追加（slots配列）または単発追加
  const slots = Array.isArray(body.slots) ? body.slots : [body];

  const rows = slots.map(s => ({
    provider_id: provider.id,
    service_id:  s.service_id || null,
    date:        s.date,
    start_time:  s.start_time,
    end_time:    s.end_time,
    capacity:    Number(s.capacity) || 1,
    is_open:     s.is_open !== false,
    // 即時予約モード（hacomono/STORES網羅計画 Phase 1）。1枠=スタッフ+部屋の組として
    // 管理することで、部屋のブロック忘れによる二重予約を構造的に防ぐ。
    staff_id:    s.staff_id || null,
    resource_id: s.resource_id || null,
  })).filter(s => s.date && s.start_time && s.end_time);

  if (rows.length === 0) {
    return Response.json({ error: 'date, start_time, end_time は必須です' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('provider_slots')
    .insert(rows)
    .select();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
