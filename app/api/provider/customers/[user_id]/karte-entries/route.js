// GET  /api/provider/customers/[user_id]/karte-entries → その顧客の来店記録ログ一覧（認証済み・新しい順）
// POST /api/provider/customers/[user_id]/karte-entries → 来店記録を1件追加（認証済み）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug').eq('email', user.email).single();
  return data || null;
}

// 対象ユーザーが実際にこの店舗にNew Me Logを紐づけているか確認（他店舗の顧客への書き込みを防ぐ）
async function isLinkedCustomer(providerSlug, userId) {
  const { data } = await supabase
    .from('user_service_logs')
    .select('id')
    .eq('provider_slug', providerSlug)
    .eq('user_id', userId)
    .eq('active', true)
    .limit(1)
    .single();
  return !!data;
}

export async function GET(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // この会員に紐付け済みの非会員時代の記録も合算する（でお要望 2026-09-01。
  // supabase-provider-manual-customers.sql 未適用の環境では provider_manual_customers
  // が無くエラーになるため、失敗しても本題（会員自身の記録）は返す）
  const [{ data, error }, manualLinked] = await Promise.all([
    supabase
      .from('provider_karte_entries')
      .select('id, note, custom_values, menu_name, staff_id, created_at')
      .eq('provider_id', provider.id)
      .eq('user_id', params.user_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('provider_manual_customers')
      .select('id')
      .eq('provider_id', provider.id)
      .eq('linked_user_id', params.user_id)
      .then(r => r.data || [])
      .catch(() => []),
  ]);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  let merged = data || [];
  if (manualLinked.length) {
    const { data: manualEntries } = await supabase
      .from('provider_karte_entries')
      .select('id, note, custom_values, menu_name, staff_id, created_at')
      .eq('provider_id', provider.id)
      .in('manual_customer_id', manualLinked.map(m => m.id));
    merged = [...merged, ...(manualEntries || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return Response.json(merged);
}

export async function POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider?.slug) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await isLinkedCustomer(provider.slug, params.user_id))) {
    return Response.json({ error: '対象のお客様が見つかりません' }, { status: 404 });
  }

  const { note, custom_values, staff_id, menu_name } = await request.json();
  if (!note?.trim() && !(custom_values && Object.keys(custom_values).length) && !menu_name) {
    return Response.json({ error: 'メモ・カスタム項目・利用メニューのいずれかは入力してください' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('provider_karte_entries')
    .insert({
      provider_id: provider.id,
      user_id: params.user_id,
      note: note?.trim() || null,
      custom_values: custom_values || {},
      staff_id: staff_id || null,
      menu_name: menu_name || null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
