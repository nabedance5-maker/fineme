// GET  /api/provider/customer-packages → 自店舗が記録した購入・残り回数の一覧
// POST /api/provider/customer-packages → 顧客への購入記録を新規登録
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

  const { data: rows, error } = await supabase
    .from('customer_packages')
    .select('id, user_id, package_id, package_name, total_sessions, purchased_at, expires_at')
    .eq('provider_id', provider.id)
    .order('purchased_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return Response.json([]);

  const ids = rows.map(r => r.id);
  const userIds = [...new Set(rows.map(r => r.user_id))];

  const [{ data: usages }, { data: profiles }] = await Promise.all([
    supabase.from('package_usages').select('id, customer_package_id, used_at, undone_at').in('customer_package_id', ids),
    supabase.from('profiles').select('id, display_name').in('id', userIds),
  ]);

  const nameMap = {};
  (profiles || []).forEach(p => { nameMap[p.id] = p.display_name; });

  const usageByPkg = {};
  (usages || []).forEach(u => { (usageByPkg[u.customer_package_id] = usageByPkg[u.customer_package_id] || []).push(u); });

  const result = rows.map(r => {
    const list = (usageByPkg[r.id] || []).filter(u => !u.undone_at);
    const lastActiveUsage = (usageByPkg[r.id] || [])
      .filter(u => !u.undone_at)
      .sort((a, b) => new Date(b.used_at) - new Date(a.used_at))[0] || null;
    return {
      ...r,
      customer_name: nameMap[r.user_id] || '(名前未設定)',
      used_sessions: list.length,
      remaining_sessions: r.total_sessions - list.length,
      last_usage_id: lastActiveUsage?.id || null,
      expired: r.expires_at ? new Date(r.expires_at) < new Date() : false,
    };
  });

  return Response.json(result);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id, package_id } = await request.json().catch(() => ({}));
  if (!user_id || !package_id) return Response.json({ error: 'user_id と package_id は必須です' }, { status: 400 });

  const { data: pkg, error: pkgError } = await supabase
    .from('service_packages')
    .select('id, name, total_sessions, validity_days')
    .eq('id', package_id)
    .eq('provider_id', provider.id)
    .single();
  if (pkgError || !pkg) return Response.json({ error: 'パッケージが見つかりません' }, { status: 404 });

  const purchasedAt = new Date();
  const expiresAt = pkg.validity_days ? new Date(purchasedAt.getTime() + pkg.validity_days * 86400000) : null;

  const { data, error } = await supabase
    .from('customer_packages')
    .insert({
      provider_id: provider.id,
      package_id: pkg.id,
      user_id,
      package_name: pkg.name,
      total_sessions: pkg.total_sessions,
      purchased_at: purchasedAt.toISOString(),
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
