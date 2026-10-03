import { getSupabase } from '@/lib/supabase';
import { gatherContext, computeJourney, GOAL } from '@/lib/consultant-journey';

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
    supabase.from('provider_consultant_settings').select('interview_done_at').eq('provider_id', provider.id).maybeSingle(),
  ]);
  const bottlenecks = bnRes.data || [];
  const journey = computeJourney(ctx, { stepStates: stepRes.data || [], bottlenecks });
  return {
    goal: GOAL,
    ctx,
    bottlenecks,
    interviewDone: !!settingsRes.data?.interview_done_at,
    ...journey,
  };
}
