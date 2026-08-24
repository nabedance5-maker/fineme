// GET  /api/provider/dormant-settings → 自店舗の休眠判定しきい値を取得（認証済み）
// POST /api/provider/dormant-settings → 休眠判定しきい値を保存（認証済み・セルフサービス）
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

  const { data } = await supabase
    .from('provider_dormant_settings')
    .select('no_visit_days')
    .eq('provider_id', provider.id)
    .maybeSingle();

  return Response.json({ no_visit_days: data?.no_visit_days ?? 90 });
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { no_visit_days } = await request.json();
  const days = Number(no_visit_days);
  if (!Number.isInteger(days) || days < 1) {
    return Response.json({ error: 'no_visit_days は1以上の整数で指定してください' }, { status: 400 });
  }

  const { error } = await supabase
    .from('provider_dormant_settings')
    .upsert({ provider_id: provider.id, no_visit_days: days, updated_at: new Date().toISOString() }, { onConflict: 'provider_id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
