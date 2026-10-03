// POST /api/provider/consultant/tasks { title, cadence?, due_date? } → 店舗が自分でタスクを足す
// PATCH /api/provider/consultant/tasks { id, status: 'open'|'done'|'skipped' } → 完了・見送り・戻す
export const dynamic = 'force-dynamic';
import { authProvider, supabase } from '../_lib';
import { periodKeys } from '@/lib/consultant-insight';

export async function POST(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!title) return Response.json({ error: 'title は必須です' }, { status: 400 });
  const cadence = ['daily', 'weekly', 'monthly', 'once'].includes(body.cadence) ? body.cadence : 'once';
  const due = cadence === 'once' && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date || '') ? body.due_date : null;
  const { data, error } = await supabase.from('provider_consultant_tasks').insert({
    provider_id: provider.id,
    title,
    cadence,
    due_date: due,
    period_key: cadence === 'once' ? null : periodKeys()[cadence],
    source: 'user',
  }).select('id').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, id: data.id });
}

export async function PATCH(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!body.id || !['open', 'done', 'skipped'].includes(body.status)) return Response.json({ error: 'id と status が必要です' }, { status: 400 });
  const { error } = await supabase.from('provider_consultant_tasks')
    .update({ status: body.status, done_at: body.status === 'done' ? new Date().toISOString() : null })
    .eq('id', body.id).eq('provider_id', provider.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
