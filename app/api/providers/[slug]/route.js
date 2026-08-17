// GET /api/providers/[slug] - 掲載者詳細（公開ページ用）
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = params;

  // RPC経由で取得（PostgREST スキーマキャッシュをバイパスし、新カラムも確実に返す）
  const { data, error } = await supabase.rpc('get_provider_by_slug', { p_slug: slug });

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
