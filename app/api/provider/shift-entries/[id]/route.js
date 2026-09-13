// PATCH  /api/provider/shift-entries/[id] → 1コマ編集（時間変更等）
// DELETE /api/provider/shift-entries/[id] → 1コマ削除
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

// このシフトコマが自店舗のものか、period経由で確認する（entries自体にはprovider_idを
// 持たせていないため、periodを介した所有権チェックが必要）
async function assertOwnEntry(providerId, entryId) {
  const { data: entry } = await supabase.from('provider_shift_entries').select('id, period_id').eq('id', entryId).single();
  if (!entry) return false;
  const { data: period } = await supabase.from('provider_shift_periods').select('id').eq('id', entry.period_id).eq('provider_id', providerId).single();
  return !!period;
}

export async function PATCH(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await assertOwnEntry(provider.id, params.id))) return Response.json({ error: 'シフトが見つかりません' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const update = { updated_at: new Date().toISOString(), source: 'manual' };
  if (body.staff_id) update.staff_id = body.staff_id;
  if (body.date) update.date = body.date;
  if (body.start_time) update.start_time = body.start_time;
  if (body.end_time) update.end_time = body.end_time;

  const { data, error } = await supabase.from('provider_shift_entries').update(update).eq('id', params.id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}

export async function DELETE(request, { params }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await assertOwnEntry(provider.id, params.id))) return Response.json({ error: 'シフトが見つかりません' }, { status: 404 });

  const { error } = await supabase.from('provider_shift_entries').delete().eq('id', params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
