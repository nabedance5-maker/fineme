// GET  /api/provider/checkins → 直近のチェックイン履歴
// POST /api/provider/checkins → チェックインを記録（{code}=QRスキャン／{offline_member_name}=非会員の代理記録）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { syncVisitToLog } from '@/lib/sync-visit';

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
    .from('provider_checkins')
    .select('id, user_id, offline_member_name, method, created_at')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return Response.json([]);

  const userIds = [...new Set(rows.filter(r => r.user_id).map(r => r.user_id))];
  let nameMap = {};
  if (userIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', userIds);
    (profiles || []).forEach(p => { nameMap[p.id] = p.display_name; });
  }

  const result = rows.map(r => ({
    ...r,
    customer_name: r.user_id ? (nameMap[r.user_id] || '(名前未設定)') : `${r.offline_member_name || '(非会員)'}（非会員）`,
  }));
  return Response.json(result);
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, offline_member_name } = await request.json().catch(() => ({}));

  if (code) {
    const { data: profile } = await supabase.from('profiles').select('id, display_name').eq('checkin_code', code).single();
    if (!profile) return Response.json({ error: 'QRコードに対応する会員が見つかりません' }, { status: 404 });

    const { data: row, error } = await supabase
      .from('provider_checkins')
      .insert({ provider_id: provider.id, user_id: profile.id, method: 'qr' })
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });

    if (provider.slug) {
      await syncVisitToLog(supabase, { userId: profile.id, providerSlug: provider.slug });
    }
    return Response.json({ ...row, customer_name: profile.display_name || '(名前未設定)' });
  }

  if (offline_member_name?.trim()) {
    const { data: row, error } = await supabase
      .from('provider_checkins')
      .insert({ provider_id: provider.id, offline_member_name: offline_member_name.trim(), method: 'manual' })
      .select()
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ...row, customer_name: `${offline_member_name.trim()}（非会員）` });
  }

  return Response.json({ error: 'codeまたはoffline_member_nameが必要です' }, { status: 400 });
}
