// POST /api/push/subscribe
// body: { endpoint, keys: { p256dh, auth } }
import { getSupabase } from '@/lib/supabase';

export async function POST(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user } } = await getSupabase().auth.getUser(token);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { endpoint, keys } = await request.json().catch(() => ({}));
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return Response.json({ error: 'endpoint と keys.p256dh / keys.auth は必須です' }, { status: 400 });
  }

  const { error } = await getSupabase()
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'endpoint' }
    );

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
