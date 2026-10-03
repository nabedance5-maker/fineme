// GET /api/provider/consultant → AIコンサルの見立て・戦略・タスク・お客様の段階・会話履歴（認証済み）
export const dynamic = 'force-dynamic';
import { authProvider, loadState, supabase, consultantEnabled } from './_lib';
import { TAB_LABELS } from '@/lib/consultant-insight';

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

  const cutoff = Date.now() - 14 * 86400000;
  const tasks = state.tasks.filter(t => t.bucket !== 'closed' || (t.done_at && new Date(t.done_at).getTime() >= cutoff && t.status === 'done'));

  return Response.json({
    enabled: true,
    premise: state.premise,
    goalText: state.goalText,
    needsGoal: !state.goalText,
    facts: state.facts,
    diagnosis: state.plan?.diagnosis || '',
    focus: state.plan?.strategy?.focus || '',
    stageActions: state.plan?.strategy?.stage_actions || [],
    questions: state.plan?.strategy?.questions || [],
    generatedAt: state.plan?.generated_at || null,
    stale: state.stale,
    tasks,
    tabLabels: TAB_LABELS,
    stages: state.insight.stages,
    timeText: state.insight.time.text,
    kpis: state.insight.kpis,
    readiness: { steps: state.steps, progress: state.progress },
    bottlenecks: state.bottlenecks,
    interviewDone: state.interviewDone,
    savedMinutesPerWeek: saved,
    messages: (msgRes.data || []).reverse(),
  });
}
