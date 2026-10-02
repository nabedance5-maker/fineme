// GET  /api/provider/customers/manual → この店舗のFineme非会員カルテ顧客一覧（認証済み）
// POST /api/provider/customers/manual → 非会員のお客様を新規作成（認証済み）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { ensureCustomerNumbers } from '@/lib/customer-numbers';

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

  const { data, error } = await supabase
    .from('provider_manual_customers')
    .select('id, display_name, memo, linked_user_id, linked_at, created_at')
    .eq('provider_id', provider.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  const rows = data || [];
  // 紐付け済みの非会員は番号を会員側へ引き継いでいるので、未紐付けのものだけ採番する（古い順に小さい番号）
  const manualIds = rows.filter(r => !r.linked_user_id).map(r => r.id).reverse();
  let numbers = {};
  try { numbers = (await ensureCustomerNumbers(supabase, provider.id, { manualIds })).manual; } catch { /* 番号が振れなくても一覧は返す */ }
  return Response.json(rows.map(r => ({ ...r, member_number: numbers[r.id] ?? null })));
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { display_name, memo } = await request.json();
  if (!display_name?.trim()) return Response.json({ error: 'お名前は必須です' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_manual_customers')
    .insert({ provider_id: provider.id, display_name: display_name.trim(), memo: memo?.trim() || null })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  let memberNumber = null;
  try { memberNumber = (await ensureCustomerNumbers(supabase, provider.id, { manualIds: [data.id] })).manual[data.id] ?? null; } catch { /* 次回の一覧取得で採番される */ }
  return Response.json({ ...data, member_number: memberNumber });
}
