// POST /api/admin/customers/manual/[id]/link → 非会員のお客様を会員に紐付ける（運営用）
// 店舗側 /api/provider/customers/manual/[id]/link と同じ検証（紐付け先は実際にその店舗に
// New Me Logを紐づけている会員のみ）と番号引き継ぎを行う。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { transferManualNumberToUser } from '@/lib/customer-numbers';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });
const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

export async function POST(request, { params }) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id } = await request.json();
  if (!user_id) return Response.json({ error: 'user_id は必須です' }, { status: 400 });

  const { data: manual } = await supabase
    .from('provider_manual_customers')
    .select('id, provider_id, linked_user_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!manual) return Response.json({ error: '非会員のお客様が見つかりません' }, { status: 404 });
  if (manual.linked_user_id) return Response.json({ error: 'すでに会員と紐付け済みです' }, { status: 409 });

  const { data: provider } = await supabase.from('providers').select('id, slug').eq('id', manual.provider_id).maybeSingle();
  if (!provider?.slug) return Response.json({ error: '店舗が見つかりません' }, { status: 404 });

  const { data: linked } = await supabase
    .from('user_service_logs')
    .select('id')
    .eq('provider_slug', provider.slug)
    .eq('user_id', user_id)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  if (!linked) return Response.json({ error: '指定された会員はこの店舗に紐づいていません' }, { status: 404 });

  const { data, error } = await supabase
    .from('provider_manual_customers')
    .update({ linked_user_id: user_id, linked_at: new Date().toISOString() })
    .eq('id', manual.id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  try { await transferManualNumberToUser(supabase, provider.id, manual.id, user_id); } catch { /* 番号の引き継ぎ失敗でも紐付け自体は成立させる */ }
  return Response.json(data);
}
