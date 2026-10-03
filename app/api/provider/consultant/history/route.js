// GET /api/provider/consultant/history → ゴールの変遷・見立ての履歴・相談の記録・AIが学んだこと（認証済み）
export const dynamic = 'force-dynamic';
import { authProvider, supabase, consultantEnabled } from '../_lib';

export async function GET(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!consultantEnabled(provider)) return Response.json({ error: 'AI専属コンサルはオフになっています' }, { status: 403 });

  const [goalRes, planRes, msgRes, setRes] = await Promise.all([
    supabase.from('provider_consultant_goal_history').select('goal_text, source, set_at').eq('provider_id', provider.id).order('set_at', { ascending: false }).limit(30),
    supabase.from('provider_consultant_plan_history').select('goal_text, diagnosis, focus, generated_at').eq('provider_id', provider.id).order('generated_at', { ascending: false }).limit(30),
    supabase.from('provider_consultant_messages').select('role, content, created_at').eq('provider_id', provider.id).order('created_at', { ascending: false }).limit(120),
    supabase.from('provider_consultant_settings').select('facts, memory_summary').eq('provider_id', provider.id).maybeSingle(),
  ]);

  return Response.json({
    goals: goalRes.data || [],
    plans: planRes.data || [],
    messages: msgRes.data || [],
    facts: setRes.data?.facts || [],
    learned: setRes.data?.memory_summary || '',
  });
}
