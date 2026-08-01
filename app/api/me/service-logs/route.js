// GET  /api/me/service-logs  — ログ一覧取得
// POST /api/me/service-logs  — ログ新規追加
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

// supabase-service-logs-v2.sql（custom_icon / cost）未適用かどうか
function isMissingV2Column(error) {
  if (!error) return false;
  return (error.code === '42703' || error.code === 'PGRST204')
    && /custom_icon|cost|frequency_months/i.test(error.message || '');
}

// supabase-service-log-visits.sql 未適用（テーブル/リレーション未検出）かどうか
function isMissingVisitsTable(error) {
  if (!error) return false;
  return error.code === 'PGRST205' || error.code === 'PGRST200' || error.code === '42P01';
}

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let { data, error } = await supabase
    .from('user_service_logs')
    .select('*, visits:user_service_log_visits(visited_at, cost)')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('axis')
    .order('next_visit', { ascending: true, nullsFirst: false });

  // supabase-service-log-visits.sql 未適用でも一覧取得自体は落とさない（visitsは空扱い）
  if (error && isMissingVisitsTable(error)) {
    const legacy = await supabase
      .from('user_service_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('axis')
      .order('next_visit', { ascending: true, nullsFirst: false });
    if (legacy.error) return Response.json({ error: legacy.error.message }, { status: 500 });
    data = legacy.data;
    error = null;
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ logs: (data || []).map(l => ({ ...l, visits: l.visits || [] })) });
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { axis, name, custom_icon, provider_slug, provider_type, frequency_weeks, frequency_months, last_visit, next_visit, memo, cost } = body;

  if (!axis || !name) {
    return Response.json({ error: 'axis と name は必須です' }, { status: 400 });
  }

  const row = {
    user_id:         user.id,
    axis:            String(axis).trim(),
    name:            String(name).trim(),
    provider_slug:   provider_slug || null,
    provider_type:   provider_type || null,
    frequency_weeks: frequency_weeks ? Number(frequency_weeks) : null,
    frequency_months: frequency_months ? Number(frequency_months) : null,
    last_visit:      last_visit || null,
    next_visit:      next_visit || null,
    memo:            memo ? String(memo).trim() : null,
    custom_icon:     custom_icon || null,
    cost:            cost ? Number(cost) : null,
  };

  const { data, error } = await supabase
    .from('user_service_logs')
    .insert(row)
    .select()
    .single();

  if (!error) return Response.json({ ok: true, log: data });

  // supabase-service-logs-v2.sql 未適用でも登録自体は通す（費用・アイコンだけ落ちる）
  if (isMissingV2Column(error)) {
    const { custom_icon: _i, cost: _c, frequency_months: _fm, ...legacyRow } = row;
    const legacy = await supabase.from('user_service_logs').insert(legacyRow).select().single();
    if (legacy.error) return Response.json({ error: legacy.error.message }, { status: 500 });
    return Response.json({ ok: true, log: legacy.data, pending_migration: true });
  }

  return Response.json({ error: error.message }, { status: 500 });
}
