// エリア需要ダッシュボード（店舗SaaS実装仕様書 SAAS-029、要件を一部変更して実装）。
//
// 元仕様はMe Scanの優先軸分布を使う設計だったが、優先軸・タイプ名の判定ロジックは
// クライアント側にしかなく（診断結果は raw_data＝生の回答のみをDBに保存）、
// サーバー側で安全に再現できる状態ではなかった。代わりに、同じくスコアという形で
// 「改善余地」を持つMirrorの結果（mirror_sessions.report_content.scores）を需要の
// 代理指標として使う。都道府県ごとに、Mirrorスコアが低い（伸びしろが大きい）人が
// どれだけいるか、対してその都道府県に何軒・どの軸に対応した店舗があるかを比較する。
//
// 元仕様のarea_demand_snapshots（バッチ集計テーブル）は作らず、都度算出にした
// （フェーズ1で確立した「スナップショットを持つと同期漏れが起きる」という判断を踏襲）。
import { getSupabase } from '@/lib/supabase';
import { axisScoresFromReportContent, MIRROR_AXES } from '@/lib/mirror-match';

const NEEDS_IMPROVEMENT_THRESHOLD = 60; // このスコア未満を「伸びしろあり」とみなす

export async function computeAreaDemand({ prefecture } = {}) {
  const supabase = getSupabase();

  // Mirror済みユーザーの最新スコア×都道府県
  const { data: sessions } = await supabase
    .from('mirror_sessions')
    .select('user_id, report_content, created_at')
    .eq('paid', true)
    .not('report_content', 'is', null)
    .order('created_at', { ascending: false });

  const latestByUser = {};
  (sessions || []).forEach(s => { if (!latestByUser[s.user_id]) latestByUser[s.user_id] = s; });
  const userIds = Object.keys(latestByUser);
  if (!userIds.length) return { areas: [] };

  const { data: profiles } = await supabase.from('profiles').select('id, area').in('id', userIds);
  const areaByUser = {};
  (profiles || []).forEach(p => { if (p.area) areaByUser[p.id] = p.area; });

  // 都道府県×軸ごとに「伸びしろあり」人数を集計
  const demandByAreaAxis = {}; // { [area]: { [axis]: count } }
  for (const userId of userIds) {
    const area = areaByUser[userId];
    if (!area) continue;
    if (prefecture && area !== prefecture) continue;
    const scores = axisScoresFromReportContent(latestByUser[userId].report_content.scores || {});
    const bucket = (demandByAreaAxis[area] = demandByAreaAxis[area] || {});
    for (const axis of MIRROR_AXES) {
      if (typeof scores[axis] === 'number' && scores[axis] < NEEDS_IMPROVEMENT_THRESHOLD) {
        bucket[axis] = (bucket[axis] || 0) + 1;
      }
    }
  }

  const areas = Object.keys(demandByAreaAxis);
  if (!areas.length) return { areas: [] };

  // 供給側：都道府県ごとの公開中・有料店舗が対応している軸
  const { data: providers } = await supabase
    .from('providers')
    .select('id, prefecture')
    .eq('published', true)
    .eq('billing_status', 'active')
    .in('prefecture', areas);

  const providerIdsByArea = {};
  (providers || []).forEach(p => { (providerIdsByArea[p.prefecture] = providerIdsByArea[p.prefecture] || []).push(p.id); });

  const allProviderIds = (providers || []).map(p => p.id);
  const { data: menus } = allProviderIds.length
    ? await supabase.from('provider_experience_menus').select('provider_id, axes').in('provider_id', allProviderIds).eq('is_active', true)
    : { data: [] };
  const axesByProvider = {};
  (menus || []).forEach(m => { axesByProvider[m.provider_id] = new Set([...(axesByProvider[m.provider_id] || []), ...(m.axes || [])]); });

  const result = areas.map(area => {
    const supplyProviderIds = providerIdsByArea[area] || [];
    const supplyAxisCount = {};
    MIRROR_AXES.forEach(axis => {
      supplyAxisCount[axis] = supplyProviderIds.filter(pid => axesByProvider[pid]?.has(axis)).length;
    });
    const axisGaps = MIRROR_AXES
      .map(axis => ({ axis, demand: demandByAreaAxis[area][axis] || 0, supply: supplyAxisCount[axis] }))
      .filter(a => a.demand > 0)
      .sort((a, b) => b.demand - a.demand);
    return {
      prefecture: area,
      providerCount: supplyProviderIds.length,
      axisGaps,
    };
  }).sort((a, b) => {
    const aDemand = a.axisGaps.reduce((s, x) => s + x.demand, 0);
    const bDemand = b.axisGaps.reduce((s, x) => s + x.demand, 0);
    return bDemand - aDemand;
  });

  return { areas: result, threshold: NEEDS_IMPROVEMENT_THRESHOLD };
}
