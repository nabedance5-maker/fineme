// GET /api/provider/classes/[id]/sessions/[sessionId]/attendees → その開催回の予約者一覧
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
  const { id, sessionId } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: slot } = await supabase.from('provider_slots').select('id').eq('id', sessionId).eq('provider_id', provider.id).eq('class_id', id).single();
  if (!slot) return Response.json({ error: '開催回が見つかりません' }, { status: 404 });

  const { data: rows, error } = await supabase
    .from('reservations')
    .select('id, user_id, user_name, user_contact, status')
    .eq('slot_id', sessionId)
    .in('status', OCCUPYING_STATUSES)
    .order('created_at', { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(rows || []);
}
