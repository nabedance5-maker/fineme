// Mirror分析（mirror_sessions.analysis.axes）の軸ごとpotential_level比較の共通ロジック
// navi-reconcile / navi-steps/mirror-sync から利用される

export const LEVEL_ORDER = { '高': 2, '中': 1, '低': 0 };

export const AXIS_LABELS_JA = {
  eyebrow: '眉', skin: '肌ケア', hair: '髪', body: '体型',
  fashion: '服', hairremoval: '脱毛', teeth: '歯', nail: '爪',
};

// Mirror分析結果から axisId → potential_level のマップを作る
export function buildAxisLevelMap(analysis) {
  const map = {};
  for (const ax of analysis?.axes || []) {
    map[ax.id] = ax.potential_level;
  }
  return map;
}

// prevLevel/newLevel（'高'|'中'|'低'）を比較し、potential_levelが下がった（余地が減った=改善）なら true。
// どちらかが欠けている場合は null（比較不能・Mirror対象外の軸）。
export function isImproved(prevLevel, newLevel) {
  if (!prevLevel || !newLevel) return null;
  return (LEVEL_ORDER[prevLevel] ?? -1) > (LEVEL_ORDER[newLevel] ?? -1);
}
