// PUT /api/provider/consultant/goals { goals: string[], note?: string } → 店舗が選んだゴールと自由記述を保存
export const dynamic = 'force-dynamic';
import { authProvider, supabase, GOAL_KEYS } from '../_lib';

export async function PUT(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  const goals = [...new Set((Array.isArray(body.goals) ? body.goals : []).filter(g => GOAL_KEYS.includes(g)))];
  const note = String(body.note || '').trim().slice(0, 500);
  const now = new Date().toISOString();

  const { error } = await supabase.from('provider_consultant_settings').upsert(
    { provider_id: provider.id, goals, goal_note: note || null, goals_set_at: goals.length ? now : null, updated_at: now },
    { onConflict: 'provider_id' }
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, goals, note });
}
