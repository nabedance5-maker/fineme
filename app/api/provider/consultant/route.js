// GET /api/provider/consultant → AI専属コンサルの道筋・今の一手・ボトルネック・会話履歴（認証済み）
export const dynamic = 'force-dynamic';
import { authProvider, loadState, supabase, consultantEnabled } from './_lib';

export async function GET(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  if (!consultantEnabled(provider)) return Response.json({ enabled: false });

  const [state, msgRes] = await Promise.all([
    loadState(provider),
    supabase.from('provider_consultant_messages').select('role, content, created_at').eq('provider_id', provider.id).order('created_at', { ascending: false }).limit(20),
  ]);

  const saved = state.bottlenecks
    .filter(b => b.status === 'resolved' && b.minutes_per_week)
    .reduce((sum, b) => sum + b.minutes_per_week, 0);

  return Response.json({
    enabled: true,
    premise: state.premise,
    goalOptions: state.goalOptions,
    goals: state.goals,
    goalNote: state.goalNote,
    needsGoals: state.needsGoals,
    steps: state.steps,
    current: state.current,
    progress: state.progress,
    bottlenecks: state.bottlenecks,
    interviewDone: state.interviewDone,
    savedMinutesPerWeek: saved,
    messages: (msgRes.data || []).reverse(),
  });
}
