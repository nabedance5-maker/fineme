// GET   /api/provider/membership-settings → 自店舗の入会手続き設定を取得
// PATCH /api/provider/membership-settings → 保存
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

async function getProviderByToken(token) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabase.from('providers').select('id').eq('email', user.email).single();
  return data || null;
}

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase.from('provider_membership_settings').select('*').eq('provider_id', provider.id).maybeSingle();
  return Response.json({
    prorate_first_month: data?.prorate_first_month ?? true,
    require_id_document: data?.require_id_document ?? true,
    terms_text: data?.terms_text || '',
  });
}

export async function PATCH(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const update = { provider_id: provider.id, updated_at: new Date().toISOString() };
  if ('prorate_first_month' in body) update.prorate_first_month = !!body.prorate_first_month;
  if ('require_id_document' in body) update.require_id_document = !!body.require_id_document;
  if ('terms_text' in body) update.terms_text = body.terms_text || null;

  const { error } = await supabase.from('provider_membership_settings').upsert(update);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
