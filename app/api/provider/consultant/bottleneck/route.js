// POST  /api/provider/consultant/bottleneck { category, label?, minutes_per_week? } → 「時間を取られている作業」を記録
// POST  同上 { skip: true } → ヒアリングを後回しにする
// PATCH /api/provider/consultant/bottleneck { id, status: 'resolved'|'dismissed'|'open' }
export const dynamic = 'force-dynamic';
import { authProvider, supabase } from '../_lib';
import { BOTTLENECK_CATEGORIES } from '@/lib/consultant-journey';

async function markInterviewDone(providerId) {
  await supabase.from('provider_consultant_settings').upsert(
    { provider_id: providerId, interview_done_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { onConflict: 'provider_id' }
  );
}

export async function POST(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();

  if (body.skip) {
    await markInterviewDone(provider.id);
    return Response.json({ ok: true });
  }

  const cat = BOTTLENECK_CATEGORIES.find(c => c.key === body.category);
  if (!cat) return Response.json({ error: 'category が不正です' }, { status: 400 });
  const label = String(body.label || '').trim().slice(0, 200) || cat.label;
  const minutes = Number.isFinite(Number(body.minutes_per_week)) && Number(body.minutes_per_week) > 0
    ? Math.min(Math.round(Number(body.minutes_per_week)), 10080)
    : null;

  const { data, error } = await supabase
    .from('provider_consultant_bottlenecks')
    .insert({ provider_id: provider.id, category: cat.key, label, minutes_per_week: minutes, source: 'interview' })
    .select('id')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await markInterviewDone(provider.id);
  return Response.json({ ok: true, id: data.id });
}

export async function PATCH(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, status } = await request.json();
  if (!id || !['open', 'resolved', 'dismissed'].includes(status)) {
    return Response.json({ error: 'パラメータが不正です' }, { status: 400 });
  }
  const { error } = await supabase
    .from('provider_consultant_bottlenecks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
