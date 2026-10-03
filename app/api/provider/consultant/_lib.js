import { getSupabase } from '@/lib/supabase';
import { gatherContext, computeJourney, GOAL_OPTIONS, GOAL_KEYS, PREMISE } from '@/lib/consultant-journey';
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

export async function loadState(provider) {
  const [ctx, stepRes, bnRes, settingsRes] = await Promise.all([
    gatherContext(supabase, provider),
    supabase.from('provider_consultant_step_state').select('step_key, status, until').eq('provider_id', provider.id),
    supabase.from('provider_consultant_bottlenecks').select('id, category, label, minutes_per_week, source, status, created_at').eq('provider_id', provider.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('provider_consultant_settings').select('interview_done_at, goals, goal_note').eq('provider_id', provider.id).maybeSingle(),
  ]);
  const bottlenecks = bnRes.data || [];
  const goals = (settingsRes.data?.goals || []).filter(g => GOAL_KEYS.includes(g));
  const journey = computeJourney(ctx, { stepStates: stepRes.data || [], bottlenecks, goals });
  return {
    premise: PREMISE,
    goalOptions: GOAL_OPTIONS,
    goals,
    goalNote: settingsRes.data?.goal_note || '',
    ctx,
    bottlenecks,
    interviewDone: !!settingsRes.data?.interview_done_at,
    ...journey,
  };
}
