// POST /api/push/unsubscribe
// body: { endpoint }
import { getSupabase } from '@/lib/supabase';

export async function POST(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await getSupabase().auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint } = await request.json().catch(() => ({}));
  if (!endpoint) return Response.json({ error: 'endpoint は必須です' }, { status: 400 });

  const { error } = await getSupabase()
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
