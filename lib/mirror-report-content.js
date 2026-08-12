// lib/mirror-report-content.js
// Claude Haikuが返したビジュアルレポートJSONの軽量バリデーション。
// スコアの範囲外値・欠損フィールドを補正し、MirrorReportCardが安全にレンダリングできる形に整える。

const SCORE_KEYS = [
  'face_balance', 'parts_layout', 'hair', 'skin', 'body_shaping',
  'posture', 'fashion', 'color_matching', 'overall_cohesion', 'photo_impression',
];

function clampScore(v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function validateReportContent(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const scores = {};
  for (const key of SCORE_KEYS) {
    scores[key] = clampScore(raw.scores?.[key]);
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
    visual_score: clampScore(raw.visual_score) ?? 0,
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
