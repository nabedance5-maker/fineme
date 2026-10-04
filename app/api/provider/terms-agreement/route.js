// GET  /api/provider/terms-agreement → 現行の規約版と、掲載者の同意履歴
// POST /api/provider/terms-agreement → 現行の規約版に同意した日時を記録
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { PROVIDER_TERMS_VERSION } from '@/lib/terms-version';
import { withAudit } from '@/lib/activity-log';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProvider(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await supabase
    .from('provider_terms_agreements')
    .select('terms_version, agreed_at')
    .eq('provider_id', provider.id)
    .order('agreed_at', { ascending: false });
  const history = data || [];
  return Response.json({
    currentVersion: PROVIDER_TERMS_VERSION,
    agreedCurrent: history.find(h => h.terms_version === PROVIDER_TERMS_VERSION) || null,
    history,
  });
}

async function __POST(request) {
  const provider = await getProvider(request);
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabase
    .from('provider_terms_agreements')
    .upsert({ provider_id: provider.id, terms_version: PROVIDER_TERMS_VERSION }, { onConflict: 'provider_id,terms_version', ignoreDuplicates: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, version: PROVIDER_TERMS_VERSION });
}

export const POST = withAudit(__POST);
