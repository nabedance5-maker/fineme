// GET /api/provider/customers/[user_id]/note → 店舗専用メモを取得（認証済み）
// PUT /api/provider/customers/[user_id]/note → 店舗専用メモを保存（認証済み）
// ユーザー本人には見せない前提のメモ（簡易カルテ）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('provider_customer_notes')
    .select('note, updated_at')
    .eq('provider_id', provider.id)
    .eq('user_id', params.user_id)
    .single();

  return Response.json({ note: data?.note || '', updated_at: data?.updated_at || null });
}

export async function PUT(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { note } = await request.json();
  const { error } = await supabase
    .from('provider_customer_notes')
    .upsert({
      provider_id: provider.id,
      user_id: params.user_id,
      note: note || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id,user_id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
