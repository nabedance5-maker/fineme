// POST /api/provider/consultant/step-state { step_key, action: 'snooze'|'skip'|'reset' }
export const dynamic = 'force-dynamic';
import { authProvider, supabase } from '../_lib';
import { STEPS } from '@/lib/consultant-journey';

const SNOOZE_DAYS = 3;

export async function POST(request) {
  const provider = await authProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { step_key, action } = await request.json();
  if (!STEPS.some(s => s.key === step_key)) return Response.json({ error: 'step_key が不正です' }, { status: 400 });

  if (action === 'reset') {
    await supabase.from('provider_consultant_step_state').delete().eq('provider_id', provider.id).eq('step_key', step_key);
    return Response.json({ ok: true });
  }
  if (action !== 'snooze' && action !== 'skip') return Response.json({ error: 'action が不正です' }, { status: 400 });

  const row = {
    provider_id: provider.id,
    step_key,
    status: action === 'snooze' ? 'snoozed' : 'skipped',
    until: action === 'snooze' ? new Date(Date.now() + SNOOZE_DAYS * 86400000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('provider_consultant_step_state').upsert(row, { onConflict: 'provider_id,step_key' });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
