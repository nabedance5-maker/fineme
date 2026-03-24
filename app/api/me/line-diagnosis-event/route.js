// POST /api/me/line-diagnosis-event
// ログインユーザーのプロフィールにline_user_idがあれば、LINE serverに診断完了イベントを登録する
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const LINE_SERVER = process.env.LINE_SERVER_URL || 'http://localhost:4015';

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { compass_first } = await request.json().catch(() => ({}));

  // プロフィールからLINE user IDを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('line_user_id')
    .eq('id', user.id)
    .maybeSingle();

  const lineUserId = profile?.line_user_id;
  if (!lineUserId) return Response.json({ ok: false, reason: 'no_line_id' });

  try {
    const res = await fetch(`${LINE_SERVER}/line/diagnosis-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ line_user_id: lineUserId, compass_first: compass_first || null }),
    });
    if (!res.ok) return Response.json({ ok: false, reason: 'line_server_error' });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, reason: 'unreachable' });
  }
}
