// GET /api/providers/[slug]/membership-info → 公開。入会フォームに必要な情報一式
// （プラン一覧・店舗設定・ロッカー一覧）をまとめて返す。入会手続き機能がONかつ
// 店舗のStripe Connect設定が完了している店舗でのみ利用可能。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { normalizeCycle } from '@/lib/membership-cycle';
import { hasFeature } from '@/lib/feature-flags';
import { normalizeFormFields } from '@/lib/membership-form';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = await params;
  const { data: provider } = await supabase
    .from('providers')
    .select('id, name, plan, enabled_features, stripe_connect_id, stripe_connect_status')
    .eq('slug', slug)
    .eq('published', true)
    .single();
  if (!provider) return Response.json({ error: '店舗が見つかりません' }, { status: 404 });

  if (!hasFeature(provider, 'membership_enrollment') || provider.stripe_connect_status !== 'active') {
    return Response.json({ error: 'この店舗はオンライン入会に対応していません' }, { status: 404 });
  }

  const [{ data: plans }, { data: settings }, { data: lockers }, { data: options }, { count: couponCount }] = await Promise.all([
    // 入会ページから申し込めるプランだけ（店頭だけのプランは出さない。でお要望 2026-10-22）
    supabase.from('provider_membership_plans').select('id, name, monthly_price, description, initial_fee, included_option_ids, selectable_option_ids, ticket_grants, online_enabled').eq('provider_id', provider.id).eq('active', true).order('sort_order'),
    supabase.from('provider_membership_settings').select('*').eq('provider_id', provider.id).maybeSingle(),
    supabase.from('provider_lockers').select('id, name, monthly_fee').eq('provider_id', provider.id).eq('active', true).order('sort_order'),
    supabase.from('provider_membership_options').select('id, name, monthly_price, description').eq('provider_id', provider.id).eq('active', true).order('sort_order'),
    supabase.from('provider_membership_discounts').select('id', { count: 'exact', head: true }).eq('provider_id', provider.id).eq('active', true).not('code', 'is', null),
  ]);

  // プランで付くチケットの名前（入会ページで「毎月：ストレッチチケット4枚」と見せる）
  const { data: ticketRows } = await supabase.from('provider_tickets').select('id, name').eq('provider_id', provider.id);

  // 入会ページから申し込めるプランだけ出す。お店から送られたリンク（?plan=）のプランは、店頭だけのプランでも出す
  const linkedPlan = new URL(request.url).searchParams.get('plan');
  const visiblePlans = (plans || []).filter(p => p.online_enabled !== false || p.id === linkedPlan);

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
    plans: visiblePlans,
    // 請求日・初月の扱い・退会の締め日（入会ページで請求の予定を見せる。lib/membership-cycle.js）
    billing_cycle: { ...normalizeCycle(settings), initial_fee_timing: settings?.initial_fee_timing === 'first_dues' ? 'first_dues' : 'approval' },
    require_id_document: settings?.require_id_document ?? true,
    terms_text: settings?.terms_text || '',
    terms_file_url: settings?.terms_file_url || null,
    terms_file_name: settings?.terms_file_name || null,
    lockers: availableLockers,
    options: options || [],
    tickets: ticketRows || [],
    has_coupons: (couponCount || 0) > 0,
    form_fields: normalizeFormFields(settings?.form_fields),
    custom_fields: settings?.custom_fields || [],
  });
}
