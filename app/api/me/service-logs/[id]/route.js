// PUT    /api/me/service-logs/[id]  — 更新
// DELETE /api/me/service-logs/[id]  — 論理削除
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

// supabase-service-logs-v2.sql（custom_icon / cost）未適用かどうか
function isMissingV2Column(error) {
  if (!error) return false;
  return (error.code === '42703' || error.code === 'PGRST204')
    && /custom_icon|cost/i.test(error.message || '');
}

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function PUT(request, { params }) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { axis, name, custom_icon, provider_slug, provider_type, frequency_weeks, last_visit, next_visit, memo, cost } = body;

  const update = { updated_at: new Date().toISOString() };
  if (axis            !== undefined) update.axis            = String(axis).trim();
  if (name            !== undefined) update.name            = String(name).trim();
  if (provider_slug   !== undefined) update.provider_slug   = provider_slug || null;
  if (provider_type   !== undefined) update.provider_type   = provider_type || null;
  if (frequency_weeks !== undefined) update.frequency_weeks = frequency_weeks ? Number(frequency_weeks) : null;
  if (last_visit      !== undefined) update.last_visit      = last_visit || null;
  if (next_visit      !== undefined) update.next_visit      = next_visit || null;
  if (memo            !== undefined) update.memo            = memo ? String(memo).trim() : null;
  if (custom_icon     !== undefined) update.custom_icon     = custom_icon || null;
  if (cost            !== undefined) update.cost            = cost ? Number(cost) : null;

  // 次回日を変えたら通知サイクルもリセットする（新しい予定として通知し直す）
  if (next_visit !== undefined) update.last_notified_at = null;

  async function run(payload) {
    return supabase
      .from('user_service_logs')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
  }

  const { data, error } = await run(update);
  if (!error) return Response.json({ ok: true, log: data });

  // v2カラム未適用でも更新自体は通す
  if (isMissingV2Column(error) || /last_notified_at/i.test(error.message || '')) {
    const { custom_icon: _i, cost: _c, last_notified_at: _n, ...legacyUpdate } = update;
    const legacy = await run(legacyUpdate);
    if (legacy.error) return Response.json({ error: legacy.error.message }, { status: 500 });
    return Response.json({ ok: true, log: legacy.data, pending_migration: true });
  }

  return Response.json({ error: error.message }, { status: 500 });
}

export async function DELETE(request, { params }) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { error } = await supabase
    .from('user_service_logs')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
