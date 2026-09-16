// GET  /api/provider/classes/[id]/sessions → 開催回（予約枠）一覧。予約数込み
// POST /api/provider/classes/[id]/sessions → 開催回を追加（provider_slotsにclass_id付きで作成）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const OCCUPYING_STATUSES = ['pending', 'approved', 'counter_proposed', 'visited'];

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: cls } = await supabase.from('provider_classes').select('id').eq('id', id).eq('provider_id', provider.id).single();
  if (!cls) return Response.json({ error: 'クラスが見つかりません' }, { status: 404 });

  const { data: sessions, error } = await supabase
    .from('provider_slots')
    .select('id, date, start_time, end_time, capacity, is_open')
    .eq('provider_id', provider.id)
    .eq('class_id', id)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!sessions?.length) return Response.json([]);

  const slotIds = sessions.map(s => s.id);
  const { data: booked } = await supabase.from('reservations').select('slot_id').in('slot_id', slotIds).in('status', OCCUPYING_STATUSES);
  const bookedCount = {};
  (booked || []).forEach(r => { if (r.slot_id) bookedCount[r.slot_id] = (bookedCount[r.slot_id] || 0) + 1; });

  return Response.json(sessions.map(s => ({ ...s, booked: bookedCount[s.id] || 0 })));
}

export async function POST(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: cls } = await supabase.from('provider_classes').select('id, capacity').eq('id', id).eq('provider_id', provider.id).single();
  if (!cls) return Response.json({ error: 'クラスが見つかりません' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const { date, start_time, end_time, capacity, staff_id, resource_id } = body;
  if (!date || !start_time || !end_time) return Response.json({ error: '日付・開始/終了時刻は必須です' }, { status: 400 });

  const cap = Number.isFinite(Number(capacity)) && capacity !== '' ? Number(capacity) : (cls.capacity || 1);
  const { data, error } = await supabase
    .from('provider_slots')
    .insert({ provider_id: provider.id, class_id: id, date, start_time, end_time, capacity: cap, is_open: true, staff_id: staff_id || null, resource_id: resource_id || null })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data, { status: 201 });
}
