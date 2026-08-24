// GET /api/providers/[slug]/landing?axis=xxx → 公開情報。診断起点LP用のメニュー・事例・スタッフ
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function GET(request, { params }) {
  const { slug } = params;
  const { searchParams } = new URL(request.url);
  const axis = searchParams.get('axis');

  const { data: provider } = await supabase
    .from('providers')
    .select('id, slug, name, catchphrase, photo_url, area, price_from')
    .eq('slug', slug)
    .eq('published', true)
    .single();
  if (!provider) return Response.json({ error: 'not-found' }, { status: 404 });

  const [{ data: menus }, { data: cases }, { data: staff }] = await Promise.all([
    supabase.from('provider_experience_menus').select('*').eq('provider_id', provider.id).eq('is_active', true).order('sort_order', { ascending: true }),
    supabase.from('provider_cases').select('id, user_type, axis, before_score, after_score, image_url, published_at').eq('provider_id', provider.id).eq('approved_by_user', true).order('published_at', { ascending: false }),
    supabase.from('provider_staff').select('id, name, role, bio, photo_url, is_featured').eq('provider_id', provider.id),
  ]);

  const filteredMenus = axis ? (menus || []).filter(m => (m.axes || []).includes(axis)) : (menus || []);
  const filteredCases = axis ? (cases || []).filter(c => c.axis === axis) : (cases || []);

  return Response.json({
    provider,
    hasContent: (menus || []).length > 0,
    axis,
    menus: filteredMenus.length ? filteredMenus : (menus || []), // 該当軸のメニューが無ければ全メニューを見せる（空表示より良い）
    cases: filteredCases,
    staff: (staff || []).sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0)),
  });
}
