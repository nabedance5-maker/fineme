// lib/mirror-report-content.js
// Claude Haikuが返したビジュアルレポートJSONの軽量バリデーション。
// スコアの範囲外値・欠損フィールドを補正し、MirrorReportCardが安全にレンダリングできる形に整える。
// 総合スコア（visual_score）はHaikuに自由記述させず、ここでscores×score_weightsから
// 決定的に計算する（でお指摘: LLMの自己申告値は隣のスコアと数学的に整合する保証がない）。

// でお提供の元プロンプト「STEP14 スコアリング」16項目に合わせる
// （旧版は10項目に圧縮してしまっていた。粒度を落とさない）
const SCORE_KEYS = [
  'face_balance', 'parts_layout', 'eyes', 'eyebrows', 'nose', 'mouth',
  'faceline', 'symmetry', 'hair', 'skin', 'body_shaping', 'posture',
  'fashion', 'color_matching', 'overall_cohesion', 'photo_impression',
];

// 満点888（末広がり・でお指定）。見慣れた/100と一目で区別がつく数字にし、
// 「学校のテストの点数」的な既視感による心理的ダメージを避ける狙い。
export const VISUAL_SCORE_MAX = 888;

// スコアリング・レポート構造（フィールド構成）を変更するたびに上げる。
// report_content.schema_version が一致しない古いキャッシュは再生成対象として扱う
// （でお指摘: ロジックを直しても古いセッションが古い数字・古い構造のまま出続けるバグがあった）。
export const REPORT_SCHEMA_VERSION = 3;

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

function strArray(v, max = 10) {
  return Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).slice(0, max) : [];
}

// improvements_top は {text, category} 形式（STEP12の①〜⑨カテゴリ分類）。
// 万一プレーン文字列配列で返ってきても後方互換で受ける。
function improvementsArray(v) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 10).map(item => {
    if (typeof item === 'string') return { text: item, category: null };
    if (item && typeof item === 'object' && typeof item.text === 'string') {
      return { text: item.text, category: item.category || null };
    }
    return null;
  }).filter(Boolean);
}

export function validateReportContent(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const scores = {};
  const scoreWeights = {};
  const scoreReasons = {};
  for (const key of SCORE_KEYS) {
    scores[key] = clampScore(raw.scores?.[key]);
    scoreWeights[key] = clampWeight(raw.score_weights?.[key]);
    scoreReasons[key] = typeof raw.score_reasons?.[key] === 'string' ? raw.score_reasons[key] : '';
  }

  return {
    photo_type: raw.photo_type || null,
    photo_type_detail: raw.photo_type_detail || '',
    first_impression: raw.first_impression || '',
    face: raw.face || null,
    hair: raw.hair
      ? { ...raw.hair, recommended_styles: strArray(raw.hair.recommended_styles, 3) }
      : null,
    skin: raw.skin || null,
    neck_shoulders: raw.neck_shoulders || null,
    body: raw.body || null,
    posture: raw.posture
      ? { ...raw.posture, top_improvements: strArray(raw.posture.top_improvements, 3) }
      : null,
    fashion: raw.fashion
      ? {
          ...raw.fashion,
          recommended_silhouettes: strArray(raw.fashion.recommended_silhouettes, 5),
          recommended_colors: strArray(raw.fashion.recommended_colors, 5),
          avoid_styles: strArray(raw.fashion.avoid_styles, 5),
        }
      : null,
    visual_cohesion: raw.visual_cohesion || null,
    photo_quality: raw.photo_quality || null,
    strengths_top: strArray(raw.strengths_top, 10),
    improvements_top: improvementsArray(raw.improvements_top),
    visual_type_keywords: strArray(raw.visual_type_keywords, 5),
    visual_type_description: raw.visual_type_description || '',
    scores,
    score_weights: scoreWeights,
    score_reasons: scoreReasons,
    visual_score: computeVisualScore(scores, scoreWeights),
    visual_score_max: VISUAL_SCORE_MAX,
    schema_version: REPORT_SCHEMA_VERSION,
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
