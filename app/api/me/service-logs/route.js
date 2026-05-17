// GET  /api/me/service-logs  — ログ一覧取得
// POST /api/me/service-logs  — ログ新規追加
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user || null;
}

export async function GET(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_service_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .order('axis')
    .order('next_visit', { ascending: true, nullsFirst: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ logs: data || [] });
}

export async function POST(request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { axis, name, provider_slug, provider_type, frequency_weeks, last_visit, next_visit, memo } = body;

  if (!axis || !name) {
    return Response.json({ error: 'axis と name は必須です' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_service_logs')
    .insert({
      user_id:         user.id,
      axis:            String(axis).trim(),
      name:            String(name).trim(),
      provider_slug:   provider_slug || null,
      provider_type:   provider_type || null,
      frequency_weeks: frequency_weeks ? Number(frequency_weeks) : null,
      last_visit:      last_visit || null,
      next_visit:      next_visit || null,
      memo:            memo ? String(memo).trim() : null,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, log: data });
}
