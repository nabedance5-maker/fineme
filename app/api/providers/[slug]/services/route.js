// GET /api/providers/[slug]/services - 掲載者のサービス一覧（公開用）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { withScopeLabels } from '@/lib/booking-eligibility';

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
    .select('id,name,description,price,duration,duration_minutes,is_featured,sort_order,image_url,suitable_path_types,transformation_promise,target_axis,before_text,after_text,before_image_url,after_image_url,benefit_list,ticket_ids,ticket_cost,hide_for_members,hide_when_locked')
    .eq('provider_id', provider.id)
    .order('sort_order')
    .order('created_at');

  if (error) return Response.json({ error: error.message }, { status: 500 });
  // チケットが要るメニューには「ストレッチチケット（1回1枚）をお持ちの方」の説明を付ける（でお要望 2026-10-22）
  return Response.json(await withScopeLabels(supabase, provider.id, data || []));
}
