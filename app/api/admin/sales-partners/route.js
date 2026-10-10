// GET/POST/PATCH /api/admin/sales-partners → 営業パートナーの管理（admin専用）
//
// でお方針（2026-10-02）：Finemeに掲載していない人でも営業パートナーとして登録できる。
// provider_id を指定しない登録が、掲載者ではない営業パートナーを作る唯一の経路。
// 掲載者本人によるopt-in登録は app/api/provider/sales-partner が別途担当する。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';
function checkAdmin(request) {
  const key = request.headers.get('x-admin-key') || request.headers.get('x-internal-key');
  return key && key === ADMIN_KEY;
}

async function nextReferralCode() {
  const { data } = await supabase.from('sales_partners').select('referral_code').like('referral_code', 'FN%');
  let max = 0;
  (data || []).forEach(r => {
    const n = parseInt(String(r.referral_code || '').replace(/^FN/, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return `FN${String(max + 1).padStart(3, '0')}`;
}

export async function GET(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('sales_partners')
    .select('id, name, email, referral_code, provider_id, status, created_at, access_token, is_collaborator, collaborator_rate, excluded_provider_ids, providers(name, slug)')
    .order('created_at', { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}

// name必須。provider_idを指定しない場合＝掲載していない営業パートナーとして作成。
export async function POST(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { name, email, provider_id } = body;
  if (!name) return Response.json({ error: 'nameは必須です' }, { status: 400 });

  const referral_code = await nextReferralCode();
  const { data, error } = await supabase
    .from('sales_partners')
    .insert({ name, email: email || null, referral_code, provider_id: provider_id || null, status: 'active' })
    .select('id, name, email, referral_code, provider_id, status, created_at, access_token')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}

// status（active/inactive）の切り替えのみ許可。報酬率・報酬条件はこのAPIでは変更しない。
export async function PATCH(request) {
  if (!checkAdmin(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, status, name, email, is_collaborator, excluded_provider_ids } = body;
  if (!id) return Response.json({ error: 'idは必須です' }, { status: 400 });

  const patch = {};
  if (status === 'active' || status === 'inactive') patch.status = status;
  if (typeof name === 'string' && name.trim()) patch.name = name.trim();
  if (typeof email === 'string') patch.email = email || null;
  if (typeof is_collaborator === 'boolean') patch.is_collaborator = is_collaborator;
  if (Array.isArray(excluded_provider_ids)) patch.excluded_provider_ids = excluded_provider_ids;
  if (Object.keys(patch).length === 0) return Response.json({ error: '更新項目がありません' }, { status: 400 });

  const { data, error } = await supabase
    .from('sales_partners')
    .update(patch)
    .eq('id', id)
    .select('id, name, email, referral_code, provider_id, status, created_at, access_token')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
