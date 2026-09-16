// GET /api/provider/memberships/[id] → 申込詳細（本人確認書類は署名付きURLを都度発行）
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
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: m } = await supabase.from('provider_memberships').select('*').eq('id', id).eq('provider_id', provider.id).single();
  if (!m) return Response.json({ error: '見つかりません' }, { status: 404 });

  const [{ data: profile }, { data: plan }, { data: locker }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', m.user_id).single(),
    m.plan_id ? supabase.from('provider_membership_plans').select('name, monthly_price').eq('id', m.plan_id).single() : Promise.resolve({ data: null }),
    m.locker_id ? supabase.from('provider_lockers').select('name').eq('id', m.locker_id).single() : Promise.resolve({ data: null }),
  ]);

  let id_document_url = null;
  if (m.id_document_path) {
    const { data: signed } = await supabase.storage.from('id-documents').createSignedUrl(m.id_document_path, 300);
    id_document_url = signed?.signedUrl || null;
  }

  return Response.json({
    ...m,
    customer_name: profile?.display_name || null,
    id_document_url,
    plan_name: plan?.name || null,
    plan_price: plan?.monthly_price ?? null,
    locker_name: locker?.name || null,
  });
}
