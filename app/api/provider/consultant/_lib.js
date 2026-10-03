import { getSupabase } from '@/lib/supabase';
import { gatherContext, computeJourney, GOAL_OPTIONS, GOAL_KEYS, PREMISE } from '@/lib/consultant-journey';
import { gatherInsight, periodKeys, jstNow } from '@/lib/consultant-insight';
import { hasFeature } from '@/lib/feature-flags';

export { GOAL_KEYS };

export function consultantEnabled(provider) {
  return hasFeature(provider, 'ai_consultant');
}

export const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function authProvider(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase
    .from('providers')
    .select('id, slug, name, main_category, enabled_features')
    .eq('email', user.email)
    .single();
  return data || null;
}

const DAY = 86400000;

// タスクが今どの枠に属するか。期間を過ぎた未完了は 'missed'
export function taskBucket(task, now = jstNow()) {
  const keys = periodKeys(now);
  if (task.status !== 'open') return 'closed';
  if (task.cadence === 'daily') return task.period_key === keys.daily ? 'today' : 'missed';
  if (task.cadence === 'weekly') return task.period_key === keys.weekly ? 'week' : 'missed';
  if (task.cadence === 'monthly') return task.period_key === keys.monthly ? 'month' : 'missed';
  if (task.due_date) {
    const today = now.toISOString().slice(0, 10);
    if (task.due_date <= today) return 'today';
    const diff = Math.floor((new Date(task.due_date).getTime() - new Date(today).getTime()) / DAY);
    return diff <= 7 ? 'week' : 'month';
  }
  return 'week';
}

export async function loadState(provider) {
  const [ctx, stepRes, bnRes, settingsRes, planRes, taskRes] = await Promise.all([
    gatherContext(supabase, provider),
    supabase.from('provider_consultant_step_state').select('step_key, status, until').eq('provider_id', provider.id),
    supabase.from('provider_consultant_bottlenecks').select('id, category, label, minutes_per_week, source, status, created_at').eq('provider_id', provider.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('provider_consultant_settings').select('interview_done_at, goals, goal_note, facts').eq('provider_id', provider.id).maybeSingle(),
    supabase.from('provider_consultant_plans').select('goal_text, diagnosis, strategy, generated_at').eq('provider_id', provider.id).maybeSingle(),
    supabase.from('provider_consultant_tasks').select('id, title, why, cadence, due_date, period_key, tab, source, status, done_at, created_at')
      .eq('provider_id', provider.id).order('created_at', { ascending: false }).limit(120),
  ]);
  const insight = await gatherInsight(supabase, provider, ctx);
  const bottlenecks = bnRes.data || [];
  // 導入の準備状況は全ステップを事実として並べる（ゴールで絞らない）
  const journey = computeJourney(ctx, { stepStates: stepRes.data || [], bottlenecks, goals: GOAL_KEYS });
  const goalText = (settingsRes.data?.goal_note || '').trim();
  const plan = planRes.data || null;
  const now = jstNow();
  const today = now.toISOString().slice(0, 10);
  const planDay = plan?.generated_at ? new Date(new Date(plan.generated_at).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10) : null;
  const stale = !!goalText && (!plan || plan.goal_text !== goalText || planDay !== today);
  const tasks = (taskRes.data || []).map(t => ({ ...t, bucket: taskBucket(t, now) }));
  return {
    premise: PREMISE,
    goalOptions: GOAL_OPTIONS,
    goalText,
    facts: settingsRes.data?.facts || [],
    plan,
    stale,
    tasks,
    insight,
    ctx,
    bottlenecks,
    interviewDone: !!settingsRes.data?.interview_done_at,
    ...journey,
  };
}
