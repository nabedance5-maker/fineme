// GET  /api/provider/events → 自店舗のイベント一覧（出欠集計付き）
// POST /api/provider/events → イベントを新規作成
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

  const { data: events, error } = await supabase
    .from('provider_events')
    .select('id, title, event_date, start_time, memo, created_at')
    .eq('provider_id', provider.id)
    .order('event_date', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!events?.length) return Response.json([]);

  const { data: attendances } = await supabase
    .from('provider_event_attendances')
    .select('event_id, status')
    .in('event_id', events.map(e => e.id));

  const countsByEvent = {};
  (attendances || []).forEach(a => {
    const c = countsByEvent[a.event_id] = countsByEvent[a.event_id] || { invited: 0, attending: 0, declined: 0 };
    c[a.status] = (c[a.status] || 0) + 1;
  });

  const result = events.map(e => ({ ...e, counts: countsByEvent[e.id] || { invited: 0, attending: 0, declined: 0 } }));
  return Response.json(result);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, event_date, start_time, memo } = await request.json().catch(() => ({}));
  if (!title?.trim() || !event_date) return Response.json({ error: 'titleとevent_dateは必須です' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_events')
    .insert({ provider_id: provider.id, title: title.trim(), event_date, start_time: start_time || null, memo: memo?.trim() || null })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
