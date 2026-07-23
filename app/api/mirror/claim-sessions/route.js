// POST /api/mirror/claim-sessions
// 未ログインで決済したMirrorセッション（mirror_sessions.user_id は null）を、
// ログイン直後にクライアントのlocalStorage session_id一覧を使って自分のアカウントに紐付ける。
import { getSupabase } from '@/lib/supabase';

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await getSupabase().auth.getUser(token);
  return user || null;
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { session_ids } = await request.json().catch(() => ({}));
  if (!Array.isArray(session_ids) || !session_ids.length) {
    return Response.json({ ok: true, claimed: 0 });
  }

  const ids = session_ids.filter(Boolean).slice(0, 10);

  const { data, error } = await getSupabase()
    .from('mirror_sessions')
    .update({ user_id: user.id })
    .in('id', ids)
    .is('user_id', null)
    .select('id');

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, claimed: data?.length || 0 });
}
