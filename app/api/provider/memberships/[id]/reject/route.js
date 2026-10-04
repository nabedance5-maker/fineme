// POST /api/provider/memberships/[id]/reject → 入会申込を却下する
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withAudit } from '@/lib/activity-log';
import { planLockedResponse } from '@/lib/plan-features';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id, plan').eq('email', user.email).single();
  return data || null;
}

async function __POST(request, { params }) {
  const { id } = await params;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  { const locked = planLockedResponse(provider, 'membership_enrollment'); if (locked) return locked; }

  const { reason } = await request.json().catch(() => ({}));

  const { data, error } = await supabase
    .from('provider_memberships')
    .update({ status: 'rejected', rejected_at: new Date().toISOString(), reject_reason: reason || null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('provider_id', provider.id)
    .eq('status', 'pending_approval')
    .select()
    .single();
  if (error || !data) return Response.json({ error: '却下できませんでした（既に処理済みの可能性があります）' }, { status: 409 });
  return Response.json(data);
}

export const POST = withAudit(__POST);
