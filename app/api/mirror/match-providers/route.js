// POST /api/mirror/match-providers → Mirrorスコアに基づく店舗マッチング（認証済み）
// 店舗SaaS実装仕様書 SAAS-025。mirrorScoresはクライアントから受け取らず、
// サーバー側でuser_idから最新の有料Mirrorセッションを取得する（改ざん防止）。
export const dynamic = 'force-dynamic';
import { getSupabase } from '@/lib/supabase';
import { axisScoresFromReportContent, computeMatch } from '@/lib/mirror-match';

const supabase = new Proxy({}, { get(_, p) { return getSupabase()[p]; } });

export async function POST(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { location, radiusKm = 10, limit = 10 } = body;

  const { data: session } = await supabase
    .from('mirror_sessions')
    .select('report_content')
    .eq('user_id', user.id)
    .eq('paid', true)
    .not('report_content', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session?.report_content?.scores) {
    return Response.json({ error: 'Mirror分析がまだ完了していません' }, { status: 400 });
  }
  const userAxisScores = axisScoresFromReportContent(session.report_content.scores);

  // 候補店舗：公開中・有料プラン（New Me Mapと同じ「有料プランのみ」の扱いに合わせる）
  let query = supabase
    .from('providers')
    .select('id, slug, name, catchphrase, photo_url, area, price_from, plan, lat, lon')
    .eq('published', true)
    .eq('billing_status', 'active');
  const { data: providers, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!providers?.length) return Response.json({ providers: [] });

  const providerIds = providers.map(p => p.id);
  const [{ data: menuRows }, { data: caseRows }] = await Promise.all([
    supabase.from('provider_experience_menus').select('*').in('provider_id', providerIds).eq('is_active', true),
    supabase.from('provider_cases').select('provider_id, axis, before_score, after_score').in('provider_id', providerIds).eq('approved_by_user', true),
  ]);

  const menusByProvider = {};
  (menuRows || []).forEach(m => { (menusByProvider[m.provider_id] = menusByProvider[m.provider_id] || []).push(m); });

  const caseStatsByProvider = {};
  (caseRows || []).forEach(c => {
    const byAxis = (caseStatsByProvider[c.provider_id] = caseStatsByProvider[c.provider_id] || {});
    const s = (byAxis[c.axis] = byAxis[c.axis] || { count: 0, sumImprovement: 0 });
    s.count++;
    s.sumImprovement += (c.after_score - c.before_score);
  });
  // avgImprovementを確定
  Object.values(caseStatsByProvider).forEach(byAxis => {
    Object.values(byAxis).forEach(s => { s.avgImprovement = Math.round(s.sumImprovement / s.count); });
  });

  const results = providers
    .filter(p => menusByProvider[p.id]?.length)
    .map(p => {
      const match = computeMatch({
        userAxisScores,
        provider: p,
        menus: menusByProvider[p.id] || [],
        caseStatsByAxis: caseStatsByProvider[p.id] || {},
        userLocation: location,
      });
      return { provider: p, match };
    })
    .filter(r => r.match.matchScore > 0)
    .filter(r => !location || r.match.distanceKm == null || r.match.distanceKm <= radiusKm)
    .sort((a, b) => b.match.matchScore - a.match.matchScore)
    .slice(0, limit);

  return Response.json({
    axisScores: userAxisScores,
    providers: results.map(r => ({
      providerId: r.provider.id,
      slug: r.provider.slug,
      name: r.provider.name,
      catchphrase: r.provider.catchphrase,
      photoUrl: r.provider.photo_url,
      area: r.provider.area,
      distanceKm: r.match.distanceKm,
      matchScore: r.match.matchScore,
      matchedAxes: r.match.matchedAxes,
      bestAxis: r.match.bestAxis,
      recommendedMenu: r.match.recommendedMenu ? {
        id: r.match.recommendedMenu.id,
        name: r.match.recommendedMenu.name,
        price: r.match.recommendedMenu.price,
        durationMin: r.match.recommendedMenu.duration_min,
        evidence: r.match.evidence,
      } : null,
      plan: r.provider.plan,
    })),
  });
}
