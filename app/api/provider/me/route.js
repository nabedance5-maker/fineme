// GET /api/provider/me
// ログイン中のユーザーのメールアドレスで掲載者レコードを取得
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');

  // トークンからユーザー情報を取得
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return Response.json({ error: 'Invalid token' }, { status: 401 });
  }

  // メールアドレスで掲載者を検索
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('email', user.email)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Provider not found' }, { status: 404 });
  }

  return Response.json(data);
}
