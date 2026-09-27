// カテゴリごとのアドバイス軸・AIへの観点指示（でお要望2026-09-27）。
// v1は人間ドックのみ運用（今野くん発案）。パーソナルカラー・骨格診断等は
// 将来ここに追加すれば、APIルート・UI側の変更なしで選べるようになる設計。
export const HEALTH_ADVICE_CATEGORIES = {
  medical_checkup: {
    label: '人間ドック',
    axes: [
      { id: 'diet', label: '食事' },
      { id: 'exercise', label: '運動' },
      { id: 'lifestyle', label: '生活習慣' },
      { id: 'overall', label: '全般' },
    ],
    guidance: '健康診断・人間ドックの結果（血液検査値、BMI、血圧等）が写った写真です。数値そのものの医学的な診断はせず、一般的な生活習慣の観点から気づきを提案してください。',
  },
};

export function getHealthAdviceCategory(id) {
  return HEALTH_ADVICE_CATEGORIES[id] || null;
}
