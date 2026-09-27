// 掲載者管理画面の「LP設定」対応軸・「体験事例」軸で使う選択肢。
// Me Scanの8軸(body/eyebrow/fashion/hair/skin/hairremoval/teeth/nail)に、
// Mirrorのマッチング軸(expression/posture。lib/mirror-match.jsのMIRROR_AXES＝
// Mirrorレポートのスコア算出専用の別語彙なのでこのファイルからは変更しない)を
// 足した和集合＋「その他」。
// 対応する店舗コンテンツ(provider_experience_menus.axes・provider_cases.axis)は
// どちらもCHECK制約のないTEXT/TEXT[]列なので、ここに増やすだけでDB側の変更は不要。
//
// ⚠️ Me Scan本体(app/diagnosis, app/belle/diagnosis, lib/mirror-report-content.js等)
// のスコアリング・診断ロジックはここでは一切触らない。ここは掲載者向けフォームの
// 表示用語彙を揃えるためだけの一覧。
export const PROVIDER_AXES = [
  { key: 'body', label: '体型・ボディ' },
  { key: 'eyebrow', label: '眉' },
  { key: 'fashion', label: '服・コーデ' },
  { key: 'hair', label: '髪・ヘア' },
  { key: 'skin', label: '肌・エステ' },
  { key: 'hairremoval', label: '脱毛・ムダ毛' },
  { key: 'teeth', label: '歯・口元' },
  { key: 'nail', label: '爪' },
  { key: 'expression', label: '表情' },
  { key: 'posture', label: '姿勢' },
  { key: 'other', label: 'その他' },
];

export const PROVIDER_AXIS_LABELS = Object.fromEntries(PROVIDER_AXES.map(a => [a.key, a.label]));
