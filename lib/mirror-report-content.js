// lib/mirror-report-content.js
// Claude Haikuが返したビジュアルレポートJSONの軽量バリデーション。
// スコアの範囲外値・欠損フィールドを補正し、MirrorReportCardが安全にレンダリングできる形に整える。
// 総合スコア（visual_score）はHaikuに自由記述させず、ここでscores×score_weightsから
// 決定的に計算する（でお指摘: LLMの自己申告値は隣のスコアと数学的に整合する保証がない）。

const SCORE_KEYS = [
  'face_balance', 'parts_layout', 'hair', 'skin', 'body_shaping',
  'posture', 'fashion', 'color_matching', 'overall_cohesion', 'photo_impression',
];

// 満点888（末広がり・でお指定）。見慣れた/100と一目で区別がつく数字にし、
// 「学校のテストの点数」的な既視感による心理的ダメージを避ける狙い。
export const VISUAL_SCORE_MAX = 888;

function clampScore(v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function clampWeight(v) {
  if (typeof v !== 'number' || Number.isNaN(v) || v <= 0) return 0;
  return Math.min(100, v);
}

// scores（0-100の各カテゴリ完成度）とscore_weights（各カテゴリが第一印象を
// 左右している度合い）から、加重平均→888満点スケールへ決定的に変換する。
// weightsが全て欠損/0の場合は均等加重にフォールバックする。
function computeVisualScore(scores, weights) {
  const entries = SCORE_KEYS
    .map(key => ({ score: scores[key], weight: clampWeight(weights[key]) }))
    .filter(e => e.score != null);

  if (!entries.length) return 0;

  const weightSum = entries.reduce((sum, e) => sum + e.weight, 0);
  const avg100 = weightSum > 0
    ? entries.reduce((sum, e) => sum + e.score * e.weight, 0) / weightSum
    : entries.reduce((sum, e) => sum + e.score, 0) / entries.length; // 均等加重フォールバック

  return Math.round((avg100 / 100) * VISUAL_SCORE_MAX);
}

export function validateReportContent(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const scores = {};
  const scoreWeights = {};
  for (const key of SCORE_KEYS) {
    scores[key] = clampScore(raw.scores?.[key]);
    scoreWeights[key] = clampWeight(raw.score_weights?.[key]);
  }

  return {
    photo_type: raw.photo_type || null,
    first_impression: raw.first_impression || '',
    face: raw.face || null,
    hair: raw.hair || null,
    skin: raw.skin || null,
    neck_shoulders: raw.neck_shoulders || null,
    body: raw.body || null,
    posture: raw.posture || null,
    fashion: raw.fashion || null,
    visual_cohesion: raw.visual_cohesion || null,
    photo_quality: raw.photo_quality || null,
    strengths_top: Array.isArray(raw.strengths_top) ? raw.strengths_top.slice(0, 8) : [],
    improvements_top: Array.isArray(raw.improvements_top) ? raw.improvements_top.slice(0, 8) : [],
    visual_type_keywords: Array.isArray(raw.visual_type_keywords) ? raw.visual_type_keywords.slice(0, 5) : [],
    visual_type_description: raw.visual_type_description || '',
    scores,
    score_weights: scoreWeights,
    visual_score: computeVisualScore(scores, scoreWeights),
    visual_score_max: VISUAL_SCORE_MAX,
    final_profile: raw.final_profile || null,
  };
}

// Haikuの統合レスポンスから、旧来の analysis カラム形式（New Me Map/New Me Navi/月次比較が
// 依存する唯一のデータソース）を抽出する。axesが無い/不正なら null を返し、呼び出し側は
// レポート生成そのものを失敗として扱う（Map/Naviに壊れたデータを渡さないため）。
export function validateAxesPayload(raw) {
  if (!raw || !Array.isArray(raw.axes) || raw.axes.length === 0) return null;
  return {
    photo_type: raw.photo_type || null,
    first_impression: raw.first_impression || '',
    axes: raw.axes,
    overall_message: raw.overall_message || '',
  };
}
