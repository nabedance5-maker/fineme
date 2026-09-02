// GET  /api/provider/customers/manual/[id]/karte-entries → 非会員顧客の来店記録一覧（認証済み・新しい順）
// POST /api/provider/customers/manual/[id]/karte-entries → 来店記録を1件追加（認証済み）
// app/api/provider/customers/[user_id]/karte-entries/route.js の非会員版。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

async function ownsManualCustomer(providerId, id) {
  const { data } = await supabase.from('provider_manual_customers').select('id').eq('id', id).eq('provider_id', providerId).single();
  return !!data;
}

export async function GET(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('provider_karte_entries')
    .select('id, note, custom_values, menu_name, staff_id, created_at')
    .eq('provider_id', provider.id)
    .eq('manual_customer_id', params.id)
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

export async function POST(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await ownsManualCustomer(provider.id, params.id))) {
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
      manual_customer_id: params.id,
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
