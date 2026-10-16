// GET  /api/provider/customers/manual → この店舗のFineme非会員カルテ顧客一覧（認証済み）
// POST /api/provider/customers/manual → 非会員のお客様を新規作成（認証済み）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { ensureCustomerNumbers } from '@/lib/customer-numbers';
import { withAudit } from '@/lib/activity-log';
import { normalizeProfile } from '@/lib/customer-profile';

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
  // 基本情報の電話番号（電話番号で検索できるように。でお要望 2026-10-16）
  const { data: profs } = rows.length
    ? await supabase.from('provider_customer_profiles').select('manual_customer_id, phone, gender, birthday').eq('provider_id', provider.id).in('manual_customer_id', rows.map(r => r.id))
    : { data: [] };
  const profOf = Object.fromEntries((profs || []).map(p => [p.manual_customer_id, p]));
  return Response.json(rows.map(r => ({ ...r, member_number: numbers[r.id] ?? null, phone: profOf[r.id]?.phone || null, gender: profOf[r.id]?.gender || null, birthday: profOf[r.id]?.birthday || null })));
}

async function __POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { display_name, memo, phone } = await request.json();
  if (!display_name?.trim()) return Response.json({ error: 'お名前は必須です' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_manual_customers')
    .insert({ provider_id: provider.id, display_name: display_name.trim(), memo: memo?.trim() || null })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  let memberNumber = null;
  try { memberNumber = (await ensureCustomerNumbers(supabase, provider.id, { manualIds: [data.id] })).manual[data.id] ?? null; } catch { /* 次回の一覧取得で採番される */ }
  // 追加時に電話番号を入れた場合は、基本情報に保存する
  const ph = normalizeProfile({ phone }).phone;
  if (ph) await supabase.from('provider_customer_profiles').insert({ provider_id: provider.id, manual_customer_id: data.id, phone: ph, updated_by: '非会員の追加' });
  return Response.json({ ...data, member_number: memberNumber, phone: ph || null });
}

export const POST = withAudit(__POST);
