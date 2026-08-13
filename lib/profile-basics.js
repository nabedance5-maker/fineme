// Me Scanの「基本情報（任意）」で聞く静的な選択肢定義。
// face_type・skeletal_typeは既存のapp/mypage/navi/page.jsのSELF_CHECK_ITEMSと
// 完全に同じ語彙を使う（bodyDataの値として食い違うと同じ質問が別物として扱われてしまう）。
// でお指摘 2026-08-13：Me Scanで答えても、後から違うと分かった／その時知らなかった人のために
// Navi側でも引き続き答え直せるようにする。値はlocalStorage['fineme:body:data']を両方から共有する。

export const FACE_TYPE_OPTIONS = [
  'チャーミングソフト', 'チャーミングハード',
  'フレッシュソフト', 'フレッシュハード',
  'エレガントソフト', 'エレガントハード',
  'クールソフト', 'クールハード',
  '診断したことがない',
];

export const SKELETAL_TYPE_OPTIONS = [
  'ストレート骨格', 'ウェーブ骨格', 'ナチュラル骨格', '診断したことがない',
];

export const PERSONAL_COLOR_OPTIONS = [
  'イエベ春（スプリング）', 'ブルベ夏（サマー）', 'イエベ秋（オータム）', 'ブルベ冬（ウィンター）', '診断したことがない',
];

export const MBTI_OPTIONS = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
  'わからない',
];

// 「診断したことがない」「わからない」等は実質未回答なので、bodyDataへの書き戻しや
// AIプロンプトへの反映では値なし扱いにする
const UNKNOWN_VALUES = new Set(['診断したことがない', 'わからない']);
export function isMeaningfulProfileValue(v) {
  return !!v && !UNKNOWN_VALUES.has(v);
}
