// GET /api/providers/[slug]/staff → 公開ページ用スタッフ一覧
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = await params;

  const { data: provider } = await supabase
    .from('providers')
    .select('id')
    .eq('slug', slug)
    .eq('published', true)
    .eq('admin_hidden', false)
    .single();

  if (!provider) return Response.json([]);

  const { data, error } = await supabase
    .from('provider_staff')
    .select('id, name, role, bio, photo_url, experience_years, credentials, is_featured, sort_order')
    .eq('provider_id', provider.id)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return Response.json([]);
  return Response.json(data || []);
}
