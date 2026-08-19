// GET  /api/provider/recommended-frequencies → 自店舗の軸ごとの推奨来店周期一覧（認証済み）
// POST /api/provider/recommended-frequencies → 軸ごとの推奨周期を保存/削除（認証済み・セルフサービス）
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
    .from('provider_recommended_frequencies')
    .select('axis, frequency_weeks, frequency_months')
    .eq('provider_id', provider.id);

  return Response.json(data || []);
}

// body: { axis, frequency_weeks, frequency_months } どちらか一方。両方nullなら削除。
export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { axis, frequency_weeks, frequency_months } = await request.json();
  if (!axis) return Response.json({ error: 'axis は必須です' }, { status: 400 });

  if (!frequency_weeks && !frequency_months) {
    const { error } = await supabase
      .from('provider_recommended_frequencies')
      .delete()
      .eq('provider_id', provider.id)
      .eq('axis', axis);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, deleted: true });
  }

  const { error } = await supabase
    .from('provider_recommended_frequencies')
    .upsert({
      provider_id: provider.id,
      axis,
      frequency_weeks: frequency_weeks || null,
      frequency_months: frequency_months || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id,axis' });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
