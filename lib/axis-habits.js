// MeScanの行動習慣ヒアリング（app/diagnosis/page.js・app/belle/diagnosis/page.js の
// Q3内、軸ごとの「今の具体的行動」質問で収集）のラベルと構造の単一の真実。
// サーバー側（navi-steps/generate）とクライアント側（mypage/navi）の両方から参照する。
//
// でお指摘 2026-08-06：この回答をNew Me Mapの初期状態（実施済み／やってみる）に機械的に
// 反映したい。AIの推測ではなく回答そのものを反映するので、ここでの分類がそのまま正になる。
//
// 2026-08-13改訂：「これまでどんな道を歩いてきたか」の自己申告だけでなく、今やっている
// 具体的な行動（アイテム・頻度）を軸ごとに聞く形に変更。profile.axis_habits[axisId] は
// 全軸共通で { items: string[], freq?: string, parts?: string[] } の形。
// items は複数選択＝実施中のタグ一覧。New Me Mapの初期チェックリストは「選択済み＝実施済み、
// 未選択＝やってみる」として items だけを機械的に反映する（freq・partsはAIプロンプトの
// 解像度を上げるための付帯情報で、チェックリストには反映しない）。

// 全軸共通：複数選択の実行アイテム一覧（New Me Mapの初期チェックリストにそのまま反映される）
export const AXIS_HABIT_ITEM_LABELS = {
  body: {
    gym_strength:  'ジムで筋トレしている',
    home_strength: '自宅で自重・宅トレをしている',
    cardio:        '有酸素運動をしている',
    diet:          '食事管理をしている',
  },
  eyebrow: {
    tweezer:      '毛抜きで自己処理している',
    shaver:       'シェーバー・カミソリで自己処理している',
    salon_tattoo: 'サロン・眉毛アートメイクに通っている',
  },
  fashion: {
    fixed_brand:        '決まったブランド・店で揃えている',
    trend_check:         'SNS・雑誌でトレンドを確認している',
    personal_diagnosis:  'パーソナルカラー・骨格診断を受けたことがある',
    fit_only:             'サイズ感だけ意識している',
  },
  hair: {
    shampoo_market:  '市販シャンプーを使っている',
    shampoo_salon:   'サロン専売シャンプーを使っている',
    treatment:       'トリートメントを使っている',
    milk:            'ヘアミルクを使っている',
    oil:             'ヘアオイルを使っている',
    daily_set:       '毎日スタイリングしている',
    styling_product: 'スタイリング剤（ワックス等）を使っている',
    iron:            'アイロン（ストレート・コテ）を使っている',
  },
  skin: {
    lotion:     '化粧水を使っている',
    cream:      '乳液・クリームを使っている',
    serum:      '美容液を使っている',
    sheet_mask: 'シートマスクを使っている',
    sunscreen:  '日焼け止めを使っている',
    acne_care:  'ニキビケア用品を使っている',
    cleansing:  'クレンジング（メイク落とし）をしている',
  },
  hairremoval: {
    razor_diy: 'カミソリで自己処理している',
    cream_diy: '除毛クリームを使っている',
    salon:     '脱毛サロンに通っている',
    clinic:    '医療脱毛クリニックに通っている',
  },
  teeth: {
    whitening_otc: '市販ホワイトニング用品を使っている',
    whitening_pro: 'ホワイトニングサロン・歯科に通っている',
    braces:        '矯正中',
    checkup:       '定期検診に通っている',
  },
  nail: {
    self_trim: '自分で切っている',
    self_file: '爪やすりでケアしている',
    salon:     'ネイルサロンに通っている',
  },
};

// Belle（女性）のみ：肌軸にメイクの実施状況を追加で聞く
export const BELLE_MAKEUP_ITEM_LABELS = {
  foundation: 'ファンデーションを使っている',
  bb_cream:   'BBクリーム・CCクリームを使っている',
  concealer:  'コンシーラーを使っている',
  base_makeup_none: 'ベースメイクはしていない',
};

// 軸のitemsラベルを引くヘルパー。skin軸はBelleのメイク回答も同じitems配列に
// 混ざって入るため、ラベル解決時はメイクのラベルもフォールバックで見にいく
export function habitItemLabel(axisId, key) {
  return AXIS_HABIT_ITEM_LABELS[axisId]?.[key]
    || (axisId === 'skin' ? BELLE_MAKEUP_ITEM_LABELS[key] : null)
    || key;
}

// 頻度・種目などの付帯情報（AIプロンプトの解像度を上げるためだけの情報。
// New Me Mapのチェックリストには反映しない）
export const CLEANSE_FREQ_LABELS = {
  twice_plus: '1日2回以上', once: '1日1回', irregular: '不定期・週数回', rarely: 'ほとんどしない',
};
export const BODY_FREQ_LABELS = {
  w0: '週0回', w1_2: '週1〜2回', w3_4: '週3〜4回', w5_plus: '週5回以上',
};
export const BODY_PART_LABELS = {
  chest: '胸', back: '背中', legs: '脚', shoulders_arms: '肩・腕', abs: '腹筋', cardio_menu: '有酸素メニュー',
};
export const HAIR_SALON_FREQ_LABELS = {
  monthly: '月1回', bimonthly: '2〜3ヶ月に1回', half_year_plus: '半年以上空く', rarely: 'ほぼ行かない',
};
