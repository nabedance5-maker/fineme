// GET /api/me/packages → ログイン中ユーザーが持つ回数券・パッケージ（店舗横断）と残り回数
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: rows, error } = await supabase
    .from('customer_packages')
    .select('id, provider_id, package_name, total_sessions, purchased_at, expires_at')
    .eq('user_id', user.id)
    .order('purchased_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return Response.json([]);

  const ids = rows.map(r => r.id);
  const providerIds = [...new Set(rows.map(r => r.provider_id))];

  const [{ data: usages }, { data: providers }] = await Promise.all([
    supabase.from('package_usages').select('customer_package_id, undone_at').in('customer_package_id', ids),
    supabase.from('providers').select('id, name, slug').in('id', providerIds),
  ]);

  const providerMap = {};
  (providers || []).forEach(p => { providerMap[p.id] = p; });

  const usedByPkg = {};
  (usages || []).forEach(u => {
    if (u.undone_at) return;
    usedByPkg[u.customer_package_id] = (usedByPkg[u.customer_package_id] || 0) + 1;
  });

  const result = rows.map(r => ({
    id: r.id,
    provider_name: providerMap[r.provider_id]?.name || '(店舗)',
    provider_slug: providerMap[r.provider_id]?.slug || null,
    package_name: r.package_name,
    total_sessions: r.total_sessions,
    used_sessions: usedByPkg[r.id] || 0,
    remaining_sessions: r.total_sessions - (usedByPkg[r.id] || 0),
    purchased_at: r.purchased_at,
    expires_at: r.expires_at,
    expired: r.expires_at ? new Date(r.expires_at) < new Date() : false,
  }));

  return Response.json(result);
}
