// PATCH /api/provider/packages/[id] → パッケージ定義の編集・有効/無効切替
// 既に購入記録があるパッケージ名を変更しても、購入済み分はスナップショット
// （customer_packages.package_name）が残るため影響しない。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, slug').eq('email', user.email).single();
  return data || null;
}

export async function PATCH(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = {};
  if (typeof body.active === 'boolean') update.active = body.active;
  if (typeof body.name === 'string' && body.name.trim()) update.name = body.name.trim();
  if (body.price !== undefined) update.price = Number.isFinite(parseInt(body.price, 10)) ? parseInt(body.price, 10) : null;
  if (body.validity_days !== undefined) update.validity_days = Number.isFinite(parseInt(body.validity_days, 10)) ? parseInt(body.validity_days, 10) : null;

  // package_type変更時（hacomono/STORES網羅計画 Phase 2）：unlimitedはtotal_sessionsをNULLに、
  // それ以外はNOT NULL＋正の整数のDB制約があるため、type変更とtotal_sessions更新は必ずセットで扱う。
  if (['fixed_count', 'unlimited', 'combo'].includes(body.package_type)) {
    update.package_type = body.package_type;
  }
  const nextType = update.package_type; // 既存レコードのtypeは分からないため、bodyでtypeが来た時だけtotal_sessionsも連動させる
  if (nextType === 'unlimited') {
    update.total_sessions = null;
  } else if (Number.isInteger(parseInt(body.total_sessions, 10)) && body.total_sessions > 0) {
    update.total_sessions = parseInt(body.total_sessions, 10);
  }
  if (body.combo_ticket_sessions !== undefined) {
    const comboSessions = parseInt(body.combo_ticket_sessions, 10);
    update.combo_ticket_sessions = (nextType === 'combo' || body.package_type === undefined) && Number.isInteger(comboSessions) && comboSessions > 0 ? comboSessions : null;
  }

  if (!Object.keys(update).length) return Response.json({ error: '更新項目がありません' }, { status: 400 });

  const { data, error } = await supabase
    .from('service_packages')
    .update(update)
    .eq('id', params.id)
    .eq('provider_id', provider.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
