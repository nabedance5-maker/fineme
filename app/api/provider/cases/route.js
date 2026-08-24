// GET  /api/provider/cases → 自店舗の施術事例一覧（認証済み・承認待ち含む）
// POST /api/provider/cases → 施術事例を作成（認証済み・New Me Logで紐づいている顧客のみ指定可）
// 作成した時点ではapproved_by_user=falseで、ユーザー本人が/api/me/cases/[id]/approveで
// 承認するまで公開LPには出ない（本人の許可なく事例を公開しない設計）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('provider_cases')
    .select('*')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider?.slug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id, menu_id, user_type, axis, before_score, after_score, image_url } = await request.json();
  if (!user_id || !axis || before_score == null || after_score == null) {
    return Response.json({ error: 'user_id・axis・before_score・after_score は必須です' }, { status: 400 });
  }

  // なりすまし防止：New Me Logで自店舗に紐づいている顧客にしか事例を作れないようにする
  const { data: link } = await supabase
    .from('user_service_logs')
    .select('id')
    .eq('provider_slug', provider.slug)
    .eq('user_id', user_id)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  if (!link) return Response.json({ error: 'New Me Logで紐づいているお客様のみ事例を作成できます' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_cases')
    .insert({
      provider_id: provider.id,
      menu_id: menu_id || null,
      user_id,
      user_type: user_type || null,
      axis,
      before_score: Number(before_score),
      after_score: Number(after_score),
      image_url: image_url || null,
      approved_by_user: false,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
