// GET /api/provider/referrals → 自店舗の紹介実績一覧（新しい順）
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

  const { data: rows, error } = await supabase
    .from('provider_referrals')
    .select('id, referrer_user_id, referred_name, status, created_at, completed_at')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const referrerIds = [...new Set((rows || []).map(r => r.referrer_user_id))];
  let nameMap = {};
  if (referrerIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', referrerIds);
    (profiles || []).forEach(p => { nameMap[p.id] = p.display_name; });
  }

  return Response.json((rows || []).map(r => ({ ...r, referrer_name: nameMap[r.referrer_user_id] || '(名前不明)' })));
}
