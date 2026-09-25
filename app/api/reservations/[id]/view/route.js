// POST /api/reservations/[id]/view - 店舗がこの予約リクエストの詳細を開いた時に既読にする
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function POST(request, { params }) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: providerRow } = await supabase.from('providers').select('id').eq('email', user.email).single();
  if (!providerRow) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const { data: existing } = await supabase.from('reservations').select('provider_id, viewed_at').eq('id', id).single();
  if (!existing || existing.provider_id !== providerRow.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (existing.viewed_at) return Response.json({ ok: true, viewed_at: existing.viewed_at });

  const viewed_at = new Date().toISOString();
  const { error } = await supabase.from('reservations').update({ viewed_at }).eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, viewed_at });
}
