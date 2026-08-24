// Mirror分析→体験メニュー自動マッチのスコア算出（店舗SaaS実装仕様書 SAAS-024）。
// マッチスコア = Σ(軸別重み × 店舗得意度) + 距離補正 + プラン補正
//   軸別重み   = (100 - ユーザースコア) / 100  ※低スコア（伸びしろが大きい）ほど重い
//   店舗得意度 = 該当軸の承認済み施術事例数 × 平均改善幅（0〜1に正規化）
//              （スタッフの得意軸フラグはPhase3 SAAS-035未実装のため今は加点しない）
//   距離補正   = max(0, 1 - 距離km / 20)
//   プラン補正 = プレミアム(C):1.2 / スタンダード(B):1.0 / ライト(A):0.8

// Mirror（lib/mirror-report-content.jsのAXIS_CHECKLISTS）の7軸と、
// STEP14の16カテゴリscoresキーの対応。mirror-report-content.jsのAXIS_TO_SCORE_KEYSは
// exportされていないため、店舗マッチング用にここで軽量に再定義する（用途が違うため別物でよい）。
export const MIRROR_AXES = ['eyebrow', 'skin', 'hair', 'expression', 'posture', 'body', 'fashion'];

const AXIS_TO_SCORE_KEYS = {
  eyebrow: ['eyebrows'],
  skin: ['skin'],
  hair: ['hair'],
  posture: ['posture'],
  body: ['body_shaping'],
  fashion: ['fashion'],
  expression: ['overall_cohesion'],
};

// report_content.scores（16カテゴリ、各0-100）から、Mirror7軸ごとの平均スコアを出す
export function axisScoresFromReportContent(scores) {
  const out = {};
  for (const axis of MIRROR_AXES) {
    const keys = AXIS_TO_SCORE_KEYS[axis] || [];
    const vals = keys.map(k => scores?.[k]).filter(v => typeof v === 'number');
    out[axis] = vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  }
  return out;
}

const PLAN_BONUS = { C: 1.2, B: 1.0, A: 0.8 };

function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some(v => typeof v !== 'number')) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * @param {object} params
 * @param {Record<string, number|null>} params.userAxisScores - axisScoresFromReportContent()の結果
 * @param {object} params.provider - { id, lat, lon, plan }
 * @param {Array} params.menus - この店舗のprovider_experience_menus（is_active=trueのみ）
 * @param {Record<string, {count:number, avgImprovement:number}>} params.caseStatsByAxis - この店舗の軸ごとの事例統計
 * @param {{lat:number, lng:number}} [params.userLocation]
 * @returns {{ matchScore: number, matchedAxes: string[], bestAxis: string|null, recommendedMenu: object|null, evidence: string|null }}
 */
export function computeMatch({ userAxisScores, provider, menus, caseStatsByAxis, userLocation }) {
  const menuAxes = new Set((menus || []).flatMap(m => m.axes || []));
  const matchedAxes = MIRROR_AXES.filter(a => menuAxes.has(a) && typeof userAxisScores[a] === 'number');

  if (!matchedAxes.length) return { matchScore: 0, matchedAxes: [], bestAxis: null, recommendedMenu: null, evidence: null };

  let total = 0;
  let bestAxis = null;
  let bestAxisWeight = -1;
  for (const axis of matchedAxes) {
    const weight = (100 - userAxisScores[axis]) / 100; // 低スコアほど重い
    const stats = caseStatsByAxis[axis];
    const storeStrength = stats ? Math.min(1, (stats.count * Math.max(0, stats.avgImprovement)) / 100) : 0;
    total += weight * storeStrength;
    if (weight > bestAxisWeight) { bestAxisWeight = weight; bestAxis = axis; }
  }

  const distanceKm = userLocation ? haversineKm(userLocation.lat, userLocation.lng, provider.lat, provider.lon) : null;
  const distanceBonus = typeof distanceKm === 'number' ? Math.max(0, 1 - distanceKm / 20) : 0;
  const planBonus = PLAN_BONUS[provider.plan] ?? 0.8;

  const matchScore = Math.round((total + distanceBonus + planBonus) * 100) / 100;

  const recommendedMenu = (menus || []).find(m => (m.axes || []).includes(bestAxis)) || null;
  const bestStats = bestAxis ? caseStatsByAxis[bestAxis] : null;
  const evidence = bestStats?.count
    ? `${bestStats.count}件の事例で平均${bestStats.avgImprovement > 0 ? '+' : ''}${bestStats.avgImprovement}点の改善実績`
    : null;

  return { matchScore, matchedAxes, bestAxis, recommendedMenu, evidence, distanceKm };
}
