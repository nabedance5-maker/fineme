// GET   /api/provider/shift-settings → 自店舗のシフト作成ルール設定（未作成なら既定値で返す）
// PATCH /api/provider/shift-settings → ルール設定を更新
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

const DEFAULT_SETTINGS = { rule_type: 'as_requested', staffing_targets: {} };

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('provider_shift_settings')
    .select('rule_type, staffing_targets')
    .eq('provider_id', provider.id)
    .single();

  return Response.json(data || DEFAULT_SETTINGS);
}

export async function PATCH(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = { provider_id: provider.id, updated_at: new Date().toISOString() };
  if (body.rule_type && ['as_requested', 'staffing_target'].includes(body.rule_type)) update.rule_type = body.rule_type;
  if (body.staffing_targets && typeof body.staffing_targets === 'object') update.staffing_targets = body.staffing_targets;

  const { data, error } = await supabase
    .from('provider_shift_settings')
    .upsert(update, { onConflict: 'provider_id' })
    .select('rule_type, staffing_targets')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(data);
}
