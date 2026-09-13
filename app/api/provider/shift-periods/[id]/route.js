// PATCH  /api/provider/shift-periods/[id] → 期間のステータス変更（collecting/draft/confirmed）等
// DELETE /api/provider/shift-periods/[id] → 期間の削除（希望・シフトも連鎖削除）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function PATCH(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = {};
  if (body.status && ['collecting', 'draft', 'confirmed'].includes(body.status)) update.status = body.status;
  if (body.request_deadline !== undefined) update.request_deadline = body.request_deadline || null;
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

export async function DELETE(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('provider_shift_periods')
    .delete()
    .eq('id', params.id)
    .eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
