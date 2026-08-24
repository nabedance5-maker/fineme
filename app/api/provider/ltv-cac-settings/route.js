// GET  /api/provider/ltv-cac-settings → 広告費・粗利率の設定を取得（認証済み）
// POST /api/provider/ltv-cac-settings → 設定を保存（認証済み・セルフサービス）
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
    .from('provider_ltv_cac_settings')
    .select('monthly_ad_cost, gross_margin_pct')
    .eq('provider_id', provider.id)
    .maybeSingle();

  return Response.json({
    monthly_ad_cost: data?.monthly_ad_cost ?? 0,
    gross_margin_pct: data?.gross_margin_pct ?? 70,
  });
}

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const provider = await getProviderByToken(authHeader.replace('Bearer ', ''));
  if (!provider) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { monthly_ad_cost, gross_margin_pct } = await request.json();
  const { error } = await supabase
    .from('provider_ltv_cac_settings')
    .upsert({
      provider_id: provider.id,
      monthly_ad_cost: Number(monthly_ad_cost) || 0,
      gross_margin_pct: Math.min(100, Math.max(0, Number(gross_margin_pct) || 70)),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id' });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
