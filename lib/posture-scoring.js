// AI姿勢分析の目安スコアの決め方（2026-11-25 渡邉指摘「なんでその点数なのか、何を基準に何点プラス・マイナスなのか説明できないなら意味がない」）。
// - AIには点数を付けさせない。決まったチェック項目ごとに「ずれの大きさ（0〜3）」と「写真から見えたこと」だけを答えさせる
// - 点数はここで計算する：各部位100点から、項目ごとのずれの大きさに応じて決まった点を引く。総合は判定できた部位の平均
// - 写真から判定できない項目（横の写真が無い時の「頭が前に出ているか」等）は引かずに「判定なし」として残す
// 画面（クライアント）からも読むため、AIやStorageを使うコードはここに置かない。

export const POSTURE_PARTS = ['頭部・首', '肩まわり', '背中・胸椎', '骨盤・腰'];

// チェック項目。view = その項目を見るのに要る写真（'front' 正面 / 'side' 横 / 'either' どちらでも）
export const POSTURE_CHECKS = [
  { key: 'head_tilt', part: '頭部・首', label: '頭の左右の傾き', view: 'front' },
  { key: 'forward_head', part: '頭部・首', label: '頭が前に出ている（耳が肩より前）', view: 'side' },
  { key: 'shoulder_height', part: '肩まわり', label: '左右の肩の高さの差', view: 'front' },
  { key: 'rounded_shoulders', part: '肩まわり', label: '肩が前に入っている（巻き肩）', view: 'either' },
  { key: 'upper_back_round', part: '背中・胸椎', label: '背中の丸まり（猫背）', view: 'side' },
  { key: 'trunk_shift', part: '背中・胸椎', label: '体の中心線の左右への曲がり・ずれ', view: 'front' },
  { key: 'pelvis_height', part: '骨盤・腰', label: '左右の骨盤（腰）の高さの差', view: 'front' },
  { key: 'lumbar_tilt', part: '骨盤・腰', label: '腰の反り・骨盤の前後の傾き', view: 'side' },
];

// ずれの大きさと、引く点
// guide はAIに渡す見分け方（目で見て区別できる言葉にする。2026-11-25）
export const POSTURE_LEVELS = [
  { level: 0, label: 'ほとんど見られない', deduction: 0, guide: 'まっすぐ・左右がそろった姿勢と比べて、差が見つからない' },
  { level: 1, label: 'わずかに見られる', deduction: 5, guide: '注意して見ると分かる小さな差（例：肩の高さが指1本分ほど違う、頭がほんの少し傾いている）' },
  { level: 2, label: 'はっきり見られる', deduction: 15, guide: 'ひと目で分かる差（例：片方の肩が明らかに高い、横から見て耳が肩よりはっきり前にある、背中が丸く見える）' },
  { level: 3, label: '大きく見られる', deduction: 25, guide: '差が大きく、ほかの部位の形にも表れている（例：頭が大きく前に出て背中も強く丸まっている）' },
];

export const POSTURE_SCORE_RULE = '各部位100点から、チェック項目ごとに見られたずれの大きさで引きます（わずか −5・はっきり −15・大きい −25）。総合は判定できた部位の平均です。写真から判定できない項目は引いていません。';

const levelOf = n => POSTURE_LEVELS.find(l => l.level === n) || null;

// AIの答え（{ key: { level, note } }）を、保存する形 [{ key, part, label, level, deduction, note }] に整える。
// 横の写真が無いのに横からしか見えない項目を判定していたら、判定なしに戻す（写っていないものは採点しない）
export function normalizePostureChecks(raw, { hasSide = false } = {}) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return POSTURE_CHECKS.map(c => {
    const v = src[c.key] && typeof src[c.key] === 'object' ? src[c.key] : {};
    let lv = Number.isInteger(v.level) ? levelOf(v.level) : null;
    if (c.view === 'side' && !hasSide) lv = null;
    const note = typeof v.note === 'string' ? v.note.trim().slice(0, 80) : '';
    return { key: c.key, part: c.part, label: c.label, level: lv ? lv.level : null, deduction: lv ? lv.deduction : null, note: lv ? note : '' };
  });
}

// 保存した判定から、部位別の目安と総合の目安を出す。判定が1つも無ければ null
export function scoreFromChecks(details) {
  if (!Array.isArray(details) || !details.length) return { score: null, breakdown: null };
  const breakdown = {};
  for (const part of POSTURE_PARTS) {
    const judged = details.filter(d => d.part === part && Number.isFinite(d.deduction));
    breakdown[part] = judged.length ? Math.max(0, 100 - judged.reduce((s, d) => s + d.deduction, 0)) : null;
  }
  const vals = Object.values(breakdown).filter(Number.isFinite);
  if (!vals.length) return { score: null, breakdown: null };
  return { score: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length), breakdown };
}
