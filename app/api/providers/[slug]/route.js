// GET /api/providers/[slug] - 掲載者詳細（公開ページ用）
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = params;

  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .eq('admin_hidden', false)
    .single();

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(data);
}
