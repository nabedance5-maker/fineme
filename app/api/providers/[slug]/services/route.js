// GET /api/providers/[slug]/services - 掲載者のサービス一覧（公開用）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { scopeLabel } from '@/lib/booking-eligibility';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = params;

  // slug から provider_id を取得（公開中のみ）
  const { data: provider, error: pErr } = await supabase
    .from('providers')
    .select('id')
    .eq('slug', slug)
    .eq('published', true)
    .eq('admin_hidden', false)
    .single();

  if (pErr || !provider) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('provider_services')
    .select('id,name,description,price,duration,is_featured,sort_order,image_url,suitable_path_types,transformation_promise,target_axis,before_text,after_text,before_image_url,after_image_url,benefit_list,booking_scope,allow_ticket,eligible_package_ids,allow_membership,eligible_plan_ids,hide_when_locked')
    .eq('provider_id', provider.id)
    .order('sort_order')
    .order('created_at');

  if (error) return Response.json({ error: error.message }, { status: 500 });
  // 予約できる人が決まっているメニューには「回数券をお持ちの方」などの説明を付ける（でお要望 2026-10-20）
  const limited = (data || []).filter(x => x.booking_scope === 'limited');
  if (!limited.length) return Response.json(data || []);
  const [{ data: pk }, { data: pl }] = await Promise.all([
    supabase.from('service_packages').select('id, name').eq('provider_id', provider.id),
    supabase.from('provider_membership_plans').select('id, name').eq('provider_id', provider.id),
  ]);
  const pkn = Object.fromEntries((pk || []).map(x => [x.id, x.name])); const pln = Object.fromEntries((pl || []).map(x => [x.id, x.name]));
  return Response.json((data || []).map(x => (x.booking_scope === 'limited' ? { ...x, scope_label: scopeLabel(x, pkn, pln) } : x)));
}
