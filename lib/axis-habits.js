// MeScanの行動習慣ヒアリング（app/diagnosis/page.js・app/belle/diagnosis/page.js の
// q3_habits・CATEGORY_PHASE3.habit_opts で収集）のラベルと「実施済みとみなす値」の単一の真実。
// サーバー側（navi-steps/generate）とクライアント側（mypage/navi）の両方から参照する。
//
// でお指摘 2026-08-06：この回答をNew Me Mapの初期状態（実施済み／やってみる）に機械的に
// 反映したい。AIの推測ではなく回答そのものを反映するので、ここでの分類がそのまま正になる。

export const CLEANSE_FREQ_LABELS = {
  twice_plus: '1日2回以上', once: '1日1回', irregular: '不定期・週数回', rarely: 'ほとんどしない',
};

export const SKINCARE_ITEM_LABELS = {
  lotion: '化粧水', cream: '乳液・クリーム', serum: '美容液', sheet_mask: 'シートマスク',
  cleansing: 'クレンジング（メイク落とし）', none: '特に使っていない',
};
// 'none'（特に使っていない）は「何も選んでいない」の申告用の選択肢であり、実在のアイテムではない。
// New Me Mapの実施済み/やってみるノードを作るのはこの5つだけ（でお確認：5項目とも同じ扱い）
export const SKINCARE_ITEM_KEYS = ['lotion', 'cream', 'serum', 'sheet_mask', 'cleansing'];

export const WORKOUT_TYPE_LABELS = {
  gym: 'ジムに通っている', bodyweight: '自重トレーニング', home_equipment: '宅トレ器具を使っている', none: '特に取り組んでいない',
};
export const WORKOUT_DONE_VALUES = ['gym', 'bodyweight', 'home_equipment'];

// app/diagnosis/page.js・app/belle/diagnosis/page.js の CATEGORY_PHASE3.habit_opts と対応
export const AXIS_HABIT_LABELS = {
  eyebrow:     { self_diy: '自己処理（毛抜き・シェーバー）', salon_tattoo: 'サロン・眉毛アートメイク', none: '特にしていない' },
  fashion:     { size_fit: 'サイズ感を最優先', trend: 'トレンドを意識', fixed_brand: '決まったブランド・店で揃える', none: '特にこだわりなし' },
  hair:        { monthly: '美容院に月1回', bimonthly: '美容院に2〜3ヶ月に1回', half_year_plus: '美容院は半年以上空く', rarely: '美容院にほぼ行かない' },
  hairremoval: { self_only: '自己処理のみ', salon_clinic: 'サロン・クリニックに通っている', none: 'どちらもしていない' },
  teeth:       { whitening: 'ホワイトニング中', braces: '矯正中', interested: 'どちらもしていないが興味ある', not_concerned: '特に気にしていない' },
  nail:        { self_care: '自分で整えている', salon: 'ネイルサロンに通っている', none: '特にケアしていない' },
};
// 「積極的に取り組んでいる」とみなす値。ここに無い値は「していない」＝やってみる提案の対象
export const AXIS_HABIT_DONE_VALUES = {
  eyebrow:     ['self_diy', 'salon_tattoo'],
  fashion:     ['size_fit', 'trend', 'fixed_brand'],
  hair:        ['monthly', 'bimonthly'],
  hairremoval: ['self_only', 'salon_clinic'],
  teeth:       ['whitening', 'braces'],
  nail:        ['self_care', 'salon'],
};
// 本人が「気にしていない」と明言した値。急かさない・煽らないという方針により、
// New Me Map上には何も出さない（doneでもtodoでもなく非表示）
export const AXIS_HABIT_SKIP_VALUES = {
  teeth: ['not_concerned'],
};
