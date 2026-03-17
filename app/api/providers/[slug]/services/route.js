// GET /api/providers/[slug]/services - 掲載者のサービス一覧（公開用）
import { getSupabase } from '@/lib/supabase';

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
    .select('id,name,description,price,duration,is_featured,sort_order,image_url')
    .eq('provider_id', provider.id)
    .order('sort_order')
    .order('created_at');

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}
