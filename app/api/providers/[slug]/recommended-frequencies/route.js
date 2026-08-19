// GET /api/providers/[slug]/recommended-frequencies → 公開情報。店舗が設定した軸ごとの推奨来店周期
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = params;
  const { data: provider } = await supabase.from('providers').select('id').eq('slug', slug).single();
  if (!provider) return Response.json({ error: 'not-found' }, { status: 404 });

  const { data } = await supabase
    .from('provider_recommended_frequencies')
    .select('axis, frequency_weeks, frequency_months')
    .eq('provider_id', provider.id);

  return Response.json(data || []);
}
