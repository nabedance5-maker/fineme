// GET /api/providers - 公開中の掲載者一覧
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const area = searchParams.get('area');

  let query = supabase
    .from('providers')
    .select('id,slug,name,catchphrase,main_category,sub_categories,area,price_from,photo_url,provider_style,suitable_triggers,handles_failure_patterns')
    .eq('published', true)
    .eq('admin_hidden', false)
    .order('created_at', { ascending: false });

  if (category) query = query.eq('main_category', category);
  if (area) query = query.ilike('area', `%${area}%`);

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data || []);
}
