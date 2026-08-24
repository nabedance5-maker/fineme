// GET  /api/provider/staff   → 自分のスタッフ一覧（認証済み）
// POST /api/provider/staff   → スタッフ追加
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
    .from('provider_staff')
    .select('*')
    .eq('provider_id', provider.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data?.length) return Response.json([]);

  // リピート率・指名率（SAAS-036）。担当割当(provider_customer_notes.assigned_staff_id)と
  // New Me Logの来店回数(user_service_log_visits)から都度算出する。
  const { data: assignments } = await supabase
    .from('provider_customer_notes')
    .select('user_id, assigned_staff_id')
    .eq('provider_id', provider.id)
    .not('assigned_staff_id', 'is', null);

  const totalAssigned = assignments?.length || 0;
  const byStaff = {};
  (assignments || []).forEach(a => { (byStaff[a.assigned_staff_id] = byStaff[a.assigned_staff_id] || []).push(a.user_id); });

  const allAssignedUserIds = [...new Set((assignments || []).map(a => a.user_id))];
  const { data: logs } = allAssignedUserIds.length
    ? await supabase.from('user_service_logs').select('id, user_id').in('user_id', allAssignedUserIds).eq('provider_slug', provider.slug || '__none__')
    : { data: [] };
  // provider.slugはこのルートでは未取得のため、slugが必要な場合はここでは省略しリピート判定は
  // 「1回でも来店記録があるか」をuser_service_log_visitsの有無だけで簡易判定する。
  // 自店舗（provider_slug一致）でのその顧客の来店回数を数える
  const logIdsByUser = {};
  (logs || []).forEach(l => { (logIdsByUser[l.user_id] = logIdsByUser[l.user_id] || []).push(l.id); });
  const allLogIds = (logs || []).map(l => l.id);
  const { data: visits } = allLogIds.length
    ? await supabase.from('user_service_log_visits').select('log_id').in('log_id', allLogIds)
    : { data: [] };
  const visitCountByLogId = {};
  (visits || []).forEach(v => { visitCountByLogId[v.log_id] = (visitCountByLogId[v.log_id] || 0) + 1; });
  function visitCountForUser(userId) {
    return (logIdsByUser[userId] || []).reduce((sum, lid) => sum + (visitCountByLogId[lid] || 0), 0);
  }

  const withStats = data.map(s => {
    const userIds = byStaff[s.id] || [];
    const repeaters = userIds.filter(uid => visitCountForUser(uid) >= 2).length;
    return {
      ...s,
      assignedCount: userIds.length,
      repeatRate: userIds.length ? Math.round((repeaters / userIds.length) * 100) : null,
      designationRate: totalAssigned ? Math.round((userIds.length / totalAssigned) * 100) : null,
    };
  });

  return Response.json(withStats);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, role, bio, photo_url, experience_years, credentials, is_featured, sort_order, strong_types, strong_axes } = body;
  if (!name?.trim()) return Response.json({ error: '名前は必須です' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_staff')
    .insert({
      provider_id: provider.id,
      name: String(name).slice(0, 100),
      role: role ? String(role).slice(0, 100) : null,
      bio: bio ? String(bio).slice(0, 800) : null,
      photo_url: photo_url || null,
      experience_years: experience_years ? Number(experience_years) : null,
      credentials: credentials ? String(credentials).slice(0, 400) : null,
      is_featured: !!is_featured,
      sort_order: sort_order ? Number(sort_order) : 0,
      strong_types: Array.isArray(strong_types) ? strong_types : [],
      strong_axes: Array.isArray(strong_axes) ? strong_axes : [],
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
