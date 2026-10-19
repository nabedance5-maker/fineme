// GET /api/provider/me
// ログイン中のユーザーのメールアドレスで掲載者レコードを取得
import { getSupabase } from '@/lib/supabase';
import { normalizePerms } from '@/lib/member-perms';

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

  // スタッフ個別ログインの時は、本人の名前・役割・使えるメニューを付けて返す（管理画面の出し分け用）
  if (user.fineme_member) {
    const { data: permRow } = await supabase.from('provider_role_permissions').select('perms').eq('provider_id', data.id).eq('role', user.fineme_member.role).maybeSingle();
    return Response.json({ ...data, _member: { ...user.fineme_member, perms: normalizePerms(user.fineme_member.role, permRow?.perms) } });
  }
  return Response.json(data);
}
