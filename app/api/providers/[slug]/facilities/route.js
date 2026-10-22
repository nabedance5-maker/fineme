// GET /api/providers/[slug]/facilities → 公開ページ用：お店が「紹介する」にした部屋・設備
// （でお要望 2026-10-22：予約枠としては使わない設備も、どんな設備があるかを見せたい）
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
    .maybeSingle();
  if (!provider) return Response.json([]);

  const { data } = await supabase
    .from('provider_resources')
    .select('id, name, description')
    .eq('provider_id', provider.id)
    .eq('show_on_page', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  return Response.json(data || []);
}
