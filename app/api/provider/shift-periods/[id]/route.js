// PATCH  /api/provider/shift-periods/[id] → 期間のステータス変更（draft/confirmed）
// DELETE /api/provider/shift-periods/[id] → 期間の削除（作ったシフトも連鎖削除。スタッフの希望は日付で持つため残る）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';
const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

async function __PATCH(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }

  const body = await request.json().catch(() => ({}));
  const update = {};
  if (body.status && ['draft', 'confirmed'].includes(body.status)) update.status = body.status;
  if (!Object.keys(update).length) return Response.json({ error: '更新項目がありません' }, { status: 400 });

  const { data, error } = await supabase
    .from('provider_shift_periods')
    .update(update)
    .eq('id', params.id)
    .eq('provider_id', provider.id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}

async function __DELETE(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'shift_management'); if (locked) return locked; }

  const { error } = await supabase
    .from('provider_shift_periods')
    .delete()
    .eq('id', params.id)
    .eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

export const PATCH = withAudit(__PATCH);
export const DELETE = withAudit(__DELETE);
