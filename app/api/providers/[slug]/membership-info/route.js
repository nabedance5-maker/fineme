// GET /api/providers/[slug]/membership-info → 公開。入会フォームに必要な情報一式
// （プラン一覧・店舗設定・ロッカー一覧）をまとめて返す。入会手続き機能がONかつ
// 店舗のStripe Connect設定が完了している店舗でのみ利用可能。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { hasFeature } from '@/lib/feature-flags';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = await params;
  const { data: provider } = await supabase
    .from('providers')
    .select('id, name, enabled_features, stripe_connect_id, stripe_connect_status')
    .eq('slug', slug)
    .eq('published', true)
    .single();
  if (!provider) return Response.json({ error: '店舗が見つかりません' }, { status: 404 });

  if (!hasFeature(provider, 'membership_enrollment') || provider.stripe_connect_status !== 'active') {
    return Response.json({ error: 'この店舗はオンライン入会に対応していません' }, { status: 404 });
  }

  const [{ data: plans }, { data: settings }, { data: lockers }] = await Promise.all([
    supabase.from('provider_membership_plans').select('id, name, monthly_price, description').eq('provider_id', provider.id).eq('active', true).order('sort_order'),
    supabase.from('provider_membership_settings').select('prorate_first_month, require_id_document, terms_text').eq('provider_id', provider.id).maybeSingle(),
    supabase.from('provider_lockers').select('id, name, monthly_fee').eq('provider_id', provider.id).eq('active', true).order('sort_order'),
  ]);

  // 空きロッカーのみ提示（契約中のロッカーは選ばせない）
  let availableLockers = lockers || [];
  if (availableLockers.length) {
    const { data: activeContracts } = await supabase.from('provider_locker_contracts').select('locker_id').eq('provider_id', provider.id).eq('status', 'active').in('locker_id', availableLockers.map(l => l.id));
    const takenIds = new Set((activeContracts || []).map(c => c.locker_id));
    availableLockers = availableLockers.filter(l => !takenIds.has(l.id));
  }

  return Response.json({
    provider_id: provider.id,
    provider_name: provider.name,
    plans: plans || [],
    prorate_first_month: settings?.prorate_first_month ?? true,
    require_id_document: settings?.require_id_document ?? true,
    terms_text: settings?.terms_text || '',
    lockers: availableLockers,
  });
}
