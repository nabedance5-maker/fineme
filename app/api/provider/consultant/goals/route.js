// PUT /api/provider/consultant/goals { note: string } → 店舗が自分の言葉で書いたゴールを保存
export const dynamic = 'force-dynamic';
import { authProvider, supabase } from '../_lib';

export async function PUT(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const note = String(body.note || '').trim().slice(0, 600);
  const now = new Date().toISOString();

  const { error } = await supabase.from('provider_consultant_settings').upsert(
    { provider_id: provider.id, goal_note: note || null, goals_set_at: note ? now : null, updated_at: now },
    { onConflict: 'provider_id' }
  );
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, note });
}
