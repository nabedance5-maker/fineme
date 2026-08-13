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

// スコアリング・レポート構造（フィールド構成）・文章トーンを変更するたびに上げる。
// report_content.schema_version が一致しない古いキャッシュは再生成対象として扱う
// （でお指摘: ロジックを直しても古いセッションが古い数字・古い構造のまま出続けるバグがあった）。
// v6: ストイックMirror（叱咤する・煽る→未来を見せる→隣で導く→優しさで締める、というトーンに変更）
export const REPORT_SCHEMA_VERSION = 6;

// 旧axes（New Me Map/New Me Naviが依存する唯一のデータソース）のidと、
// STEP14の16カテゴリscoresキーの対応。事業優先度（master.md: New Me Map品質＝
// 継続価値の生命線）に直結するため、Mapが読む potential_level（高/中/低）を
// Haikuの自己申告のまま使わず、誠実に計算済みのscoresから決定的に導出し直す
// （でお指摘: 「詳細情報を軸に反映させなきゃダメ」。visual_scoreをHaikuの
// 自己申告から締め出したのと同じ理由・同じ手法をpotential_levelにも適用する）。
const AXIS_TO_SCORE_KEYS = {
  eyebrow: ['eyebrows'],
  skin: ['skin'],
  hair: ['hair'],
  posture: ['posture'],
  body: ['body_shaping'],
  fashion: ['fashion'],
  color: ['color_matching'],
  expression: ['overall_cohesion'],
  overall: ['overall_cohesion', 'photo_impression'],
};

// scoreは高いほど「すでに整っている」。potential_levelは高いほど「伸びしろが大きい」
// ため、意味的には逆向きの尺度である点に注意（既存プロンプトの整合ルールと同じ向き）。
function scoreToPotentialLevel(avgScore) {
  if (avgScore >= 75) return '低';
  if (avgScore >= 50) return '中';
  return '高';
}

// axes[].potential_level を、対応するscoresカテゴリの平均値から決定的に上書きする。
// 対応するscoreカテゴリが無い/未評価（null）の軸はHaikuの元の判定をそのまま残す。
export function alignAxesWithScores(axes, scores) {
  if (!Array.isArray(axes)) return axes;
  return axes.map(axis => {
    const keys = AXIS_TO_SCORE_KEYS[axis.id];
    if (!keys) return axis;
    const vals = keys.map(k => scores?.[k]).filter(v => v != null);
    if (!vals.length) return axis;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { ...axis, potential_level: scoreToPotentialLevel(avg) };
  });
}

// でお指摘: 888点という数字そのものが「学校のテスト」的な優劣判定に見える。
// VISUAL TYPE（診断タイプ）を主役にし、点数は8段階の階級ラベルの裏付け情報に
// 格下げする。階級名は「強い/弱い」ではなく変容の進み具合（成長ステージ）で
// 統一する（でお既定のガードレール：選民/強者フレーミング禁止）。
// 888を8等分した111刻み（末広がり888のモチーフをそのまま踏襲）。
export const VISUAL_TIERS = [
  { min: 0,   max: 111, name: '種火',     description: 'まだ見えていない魅力がたくさん眠っている段階' },
  { min: 112, max: 222, name: '芽吹き',   description: '変化の兆しが顔を出し始めた段階' },
  { min: 223, max: 333, name: '息吹',     description: '変わろうとする力が動き出した段階' },
  { min: 334, max: 444, name: '手応え',   description: '磨けば確実に応えてくれる段階' },
  { min: 445, max: 555, name: '兆し',     description: '変容の効果が見え始めている段階' },
  { min: 556, max: 666, name: '開花前夜', description: 'あと一歩で大きく変わる段階' },
  { min: 667, max: 777, name: '開花',     description: '魅力がしっかり花開いている段階' },
  { min: 778, max: 888, name: '満開',     description: '魅力を存分に発揮できている段階' },
];

export function getVisualTier(score) {
  return VISUAL_TIERS.find(t => score >= t.min && score <= t.max) || VISUAL_TIERS[0];
}

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
  const visualScore = computeVisualScore(scores, scoreWeights);
  const tier = getVisualTier(visualScore);

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
    visual_score: visualScore,
    visual_score_max: VISUAL_SCORE_MAX,
    visual_tier: tier.name,
    visual_tier_description: tier.description,
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
