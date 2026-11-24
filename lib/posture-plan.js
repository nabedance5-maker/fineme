// AIカルテ（AI姿勢分析・AI健診アドバイス）が使えるプラン。画面（クライアント）からも読むため、
// AIやStorageを使う lib/posture-analysis.js から分けて置く（中身は lib/posture-analysis.js が再エクスポート）。
// 10000円プラン＝'C'、特例無料アカウント＝'special'（実データに 'free' は無い）
const POSTURE_ELIGIBLE_PLANS = ['C', 'special'];
export function isPostureEligiblePlan(plan) {
  return POSTURE_ELIGIBLE_PLANS.includes(plan);
}
