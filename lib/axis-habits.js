// MeScanの行動習慣ヒアリング（app/diagnosis/page.js・app/belle/diagnosis/page.js の
// Q3内、軸ごとの「今の具体的行動」質問で収集）のラベルと構造の単一の真実。
// サーバー側（navi-steps/generate）とクライアント側（mypage/navi）の両方から参照する。
//
// でお指摘 2026-08-06：この回答をNew Me Mapの初期状態（実施済み／やってみる）に機械的に
// 反映したい。AIの推測ではなく回答そのものを反映するので、ここでの分類がそのまま正になる。
//
// でお指摘 2026-08-13：「これまでどんな道を歩いてきたか」の自己申告（virgin/quit/blind/
// lapsed/doingを選ばせる）は抽象的すぎて意味がない。「化粧水を使っている」「ベンチプレスを
// している」のような具体的な行動だけを聞き、現在地（path_type・care_level・優先軸）は
// その回答から自動算出する。ユーザーに自己評価を聞く質問はもう存在しない。
// profile.axis_habits[axisId] は全軸共通で { items: string[], freq?: string, other_note?: string } の形。
// items は複数選択＝実施中のタグ一覧。New Me Mapの初期チェックリストは「選択済み＝実施済み、
// 未選択＝やってみる」として items だけを機械的に反映する（freqはAIプロンプトの解像度を
// 上げるための付帯情報で、チェックリストには反映しない）。
//
// でお指摘 2026-08-13（2回目）：選択肢に「その他」＋自由記述を全軸に用意する。「その他」を
// 選ぶと items に 'other' が入り、other_note に自由記述が入る。'other' はAXIS_HABIT_ITEM_LABELS
// に存在しないキーなので、New Me Mapの固定チェックリスト（Object.entries(itemLabels)ベース）
// には出てこない。AIプロンプトにはother_noteをテキストとして渡す。

// 全軸共通：複数選択の実行アイテム一覧（New Me Mapの初期チェックリストにそのまま反映される）
export const AXIS_HABIT_ITEM_LABELS = {
  body: {
    pushup:              '腕立て伏せをしている',
    situp:               '腹筋・クランチをしている',
    squat_bodyweight:    '自重スクワットをしている',
    plank:                'プランクをしている',
    pull_up:              '懸垂（自重）をしている',
    ab_roller:            '腹筋ローラーをしている',
    stretch:              'ストレッチ・柔軟をしている',
    jump_rope:            '縄跳びをしている',
    bench_press:          'ベンチプレスをしている',
    chest_press_machine:  'チェストプレスマシンを使っている',
    squat_barbell:        'スクワット（バーベル）をしている',
    deadlift:              'デッドリフトをしている',
    lat_pulldown:          'ラットプルダウンをしている',
    dumbbell:              'ダンベルトレーニングをしている',
    shoulder_press:        'ショルダープレスをしている',
    leg_press:             'レッグプレスをしている',
    kettlebell:            'ケトルベルトレーニングをしている',
    hip_thrust:            'ヒップスラストをしている',
    running:               'ランニングをしている',
    walking:               'ウォーキングをしている',
    cycling:               'サイクリングをしている',
    swimming:              '水泳をしている',
    stair_climbing:        '階段昇降をしている',
    hiit:                  'HIITトレーニングをしている',
    yoga_pilates:          'ヨガ・ピラティスをしている',
    diet_management:       '食事管理をしている',
    protein:               'プロテインを摂取している',
    body_composition_tracking: '体組成計で記録している',
    personal_trainer:      'パーソナルトレーナーに通っている',
  },
  eyebrow: {
    tweezer:       '毛抜きで自己処理している',
    shaver:        'シェーバー・カミソリで自己処理している',
    scissors:      '眉用ハサミでカットしている',
    thread_epi:    '糸脱毛をしている',
    pencil:        '眉ペンシルで描いている',
    powder:        '眉パウダーを使っている',
    gel:           '眉マスカラ・眉ティントを使っている',
    home_tint:     'セルフ眉ティントをしている',
    stencil:       '眉テンプレート・スタンプを使っている',
    concealer_shape:'コンシーラーで輪郭を整えている',
    growth_serum:  '眉美容液を使っている',
    wax_epi:       'ワックス脱毛をしている',
    salon_shape:   'サロンで定期的にシェイプしてもらっている',
    lamination:    '眉ラミネーションをしている',
    salon_tattoo:  'サロン・眉毛アートメイクに通っている',
  },
  fashion: {
    fit_check:         '試着してサイズ感を必ず確認している',
    color_coordinate:  '色の組み合わせ（配色）を意識している',
    skin_tone_match:   '自分の肌色に似合う色を意識している',
    pattern_balance:   '柄物を選ぶときバランスを考えている',
    fabric_texture:    '素材・質感にこだわって選んでいる',
    silhouette:        'シルエット・プロポーションを意識している',
    body_cover:        '体型カバーを意識している',
    shoe_focus:        '靴にこだわって選んでいる',
    accessory_coordinate:'アクセサリー・小物で印象を調整している',
    fragrance:         '香水・フレグランスを使っている',
    layering:          '季節に合わせてレイヤードを意識している',
    tpo:               'TPOで着こなしを使い分けている',
    fixed_brand:       '決まったブランド・店で揃えている',
    trend_check:       'SNS・雑誌でトレンドを確認している',
    secondhand:        '古着・ヴィンテージを取り入れている',
    personal_diagnosis:'パーソナルカラー・骨格診断を受けたことがある',
    coordinate_record: 'コーディネートを写真で記録・管理している',
    capsule_wardrobe:  '定番アイテムを絞って着回している',
    seasonal_update:   'シーズンごとに服を見直している',
  },
  hair: {
    shampoo_market:  '市販シャンプーを使っている',
    shampoo_salon:   'サロン専売シャンプーを使っている',
    treatment:       'トリートメントを使っている',
    milk:            'ヘアミルクを使っている',
    oil:             'ヘアオイルを使っている',
    scalp_care:      '頭皮ケア（スカルプケア）をしている',
    scalp_tonic:     '育毛剤・スカルプトニックを使っている',
    hair_mask:       'ヘアパック・集中トリートメントをしている',
    hair_supplement: 'ヘアサプリ・ビタミンを摂取している',
    heat_protectant: '熱保護剤（アイロン・ドライヤー前）を使っている',
    uv_protect:      '紫外線対策（UVスプレー等）をしている',
    towel_dry:       'タオルドライを丁寧にしている',
    silk_pillow:     'シルク枕カバー等、寝具にこだわっている',
    daily_set:       '毎日スタイリングしている',
    styling_product: 'スタイリング剤（ワックス等）を使っている',
    iron:            'アイロン（ストレート・コテ）を使っている',
    perm_or_color:   'パーマ・カラーをしている',
    color_treatment: 'カラートリートメントで色を補っている',
    gray_coverage:   '白髪染めをしている',
  },
  skin: {
    lotion:          '化粧水を使っている',
    cream:           '乳液・クリームを使っている',
    serum:           '美容液を使っている',
    vitamin_c:       'ビタミンC美容液を使っている',
    retinol:         'レチノールを使っている',
    sheet_mask:      'シートマスクを使っている',
    sunscreen:       '日焼け止めを使っている',
    exfoliant:       '角質ケア・ピーリングをしている',
    eye_cream:       'アイクリームを使っている',
    acne_care:       'ニキビケア用品を使っている',
    acne_patch:      'ニキビパッチを使っている',
    spot_treatment:  '部分用ニキビ・シミケアを使っている',
    pore_care:       '毛穴パック・角栓ケアをしている',
    cleansing:       'クレンジング（メイク落とし）をしている',
    face_massage:    'フェイスマッサージ・ローラーを使っている',
    beauty_device:   '美顔器を使っている',
    mist_carry:      '保湿ミストを持ち歩いている',
    sleep_hydration: '睡眠・水分摂取など生活習慣を意識している',
    derm_visit:      '皮膚科で処方薬をもらっている',
    esthe_clinic:    'エステに通っている',
    inner_care:      'インナーケア（サプリ）を摂っている',
  },
  // Fineme（男性）向け：ひげ・体毛が中心。Belle（女性）向けは
  // BELLE_HAIRREMOVAL_ITEM_LABELS（VIO・脚・腕・ワキが中心）を別途参照する
  // （でお指摘 2026-08-13：男女で悩みの中心が違う軸を共通語彙のまま出していたのは手抜き）
  hairremoval: {
    razor_diy:        'カミソリでひげ・ムダ毛を自己処理している',
    shave_gel:        'シェービングフォーム・ジェルを使っている',
    beard_trim:       'ひげを電動トリマーで整えている',
    beard_style:      'ひげのデザイン・スタイリングをしている',
    cream_diy:        '除毛クリームを使っている',
    waxing_diy:       '自宅でワックス脱毛をしている',
    home_ipl:         '家庭用光美容器（IPL）を使っている',
    home_laser:       '家庭用レーザー脱毛器を使っている',
    salon:            '脱毛サロンに通っている',
    clinic:           '医療脱毛クリニックに通っている（ひげ脱毛含む）',
  },
  teeth: {
    electric_toothbrush: '電動歯ブラシを使っている',
    floss:               'フロス・歯間ブラシを使っている',
    tongue_care:         '舌ブラシ・舌ケアをしている',
    mouthwash:           'マウスウォッシュを使っている',
    breath_care:         '口臭ケアタブレット・ガムを使っている',
    whitening_otc:       '市販ホワイトニング用品を使っている',
    whitening_strips:    'ホワイトニングストリップスを使っている',
    whitening_pro:       'ホワイトニングサロン・歯科に通っている',
    nightguard:          'マウスピース（ナイトガード）を使っている',
    braces:              '矯正中',
    consult_only:        '矯正相談だけ受けたことがある',
    checkup:             '定期検診に通っている',
    scaling:             '定期的にクリーニング（スケーリング）を受けている',
  },
  nail: {
    self_trim:         '自分で切っている',
    self_file:         '爪やすりでケアしている',
    file_variety:      'ネイルファイルを使い分けている',
    cuticle_care:      '甘皮ケアをしている',
    nail_oil:          'ネイルオイル・クリームを使っている',
    nail_strengthener: '爪強化剤を使っている',
    hand_cream:        'ハンドクリームを併用している',
    top_coat:          'トップコート・保護剤を塗っている',
    gel_nail:          'ジェルネイル・ネイルアートをしている',
    foot_care:         'フットケア（足の爪）もしている',
    salon:             'ネイルサロンに通っている',
  },
};

// Belle（女性）のみ：肌軸にメイクの実施状況を追加で聞く
export const BELLE_MAKEUP_ITEM_LABELS = {
  foundation: 'ファンデーションを使っている',
  bb_cream:   'BBクリーム・CCクリームを使っている',
  concealer:  'コンシーラーを使っている',
  base_makeup_none: 'ベースメイクはしていない',
};

// Belle（女性）専用：脱毛・ムダ毛はVIO・脚・腕・ワキが中心（男性のひげ中心とは別語彙）
export const BELLE_HAIRREMOVAL_ITEM_LABELS = {
  razor_diy:       'カミソリで自己処理している（脚・腕・ワキなど）',
  shave_gel:       'シェービングフォーム・ジェルを使っている',
  cream_diy:       '除毛クリームを使っている',
  suppress_lotion: '抑毛ローションを使っている',
  waxing_diy:      '自宅でワックス脱毛をしている',
  home_ipl:        '家庭用光美容器（IPL）を使っている',
  vio_care:        'VIOのケアをしている',
  salon:           '脱毛サロンに通っている',
  brazilian_salon: 'ブラジリアンワックス専門店に通っている',
  clinic:          '医療脱毛クリニックに通っている',
};

// 軸のitemsラベルを引くヘルパー。skin軸はBelleのメイク回答も同じitems配列に混ざって入るため
// フォールバックで見にいく。hairremovalは男女で語彙自体が違う（同じキーでも意味が異なりうる）
// ため、genderが'female'のときはBELLE_HAIRREMOVAL_ITEM_LABELSを優先する
export function habitItemLabel(axisId, key, gender) {
  if (axisId === 'hairremoval' && gender === 'female') {
    return BELLE_HAIRREMOVAL_ITEM_LABELS[key] || AXIS_HABIT_ITEM_LABELS.hairremoval[key] || key;
  }
  return AXIS_HABIT_ITEM_LABELS[axisId]?.[key]
    || (axisId === 'skin' ? BELLE_MAKEUP_ITEM_LABELS[key] : null)
    || key;
}

// 頻度などの付帯情報（AIプロンプトの解像度を上げるためだけの情報。
// New Me Mapのチェックリストには反映しない）
export const CLEANSE_FREQ_LABELS = {
  twice_plus: '1日2回以上', once: '1日1回', irregular: '不定期・週数回', rarely: 'ほとんどしない',
};
export const BODY_FREQ_LABELS = {
  w0: '週0回', w1_2: '週1〜2回', w3_4: '週3〜4回', w5_plus: '週5回以上',
};
export const HAIR_SALON_FREQ_LABELS = {
  monthly: '月1回', bimonthly: '2〜3ヶ月に1回', half_year_plus: '半年以上空く', rarely: 'ほぼ行かない',
};

// ─── 現在地の自動判定（自己申告は聞かない）───
// 「プロ・専門サービスに実際に関与している」とみなす具体的行動。これが選ばれていれば
// 実行の裏付けが取れているとみなし、それ以外の自己流の行動は「効果不明」の扱いにする
// （でお指摘：自己申告の「継続してできている」は、家で腕立て1回だけの人と本気で
// トレーニングしている人を区別できず意味がない。区別できる唯一の客観的シグナルは
// プロ・専門サービスへの実際の関与だけ、という考え方）
export const PRO_TIER_ITEMS = {
  body:        ['personal_trainer'],
  eyebrow:     ['salon_tattoo'],
  fashion:     ['personal_diagnosis'],
  skin:        ['esthe_clinic'],
  hairremoval: ['salon', 'clinic'],
  teeth:       ['whitening_pro'],
  nail:        ['salon'],
};

// 具体的行動（items・freq）から現在地バケットを算出する。
// virgin: 何も選ばれていない / doing: プロ関与の証拠がある / blind: 自己流で行動はあるが
// 効果は未検証（quit・lapsedは「過去にやっていたか」という履歴情報が要るため、1回の
// アンケートでは判定できず使わない）
export function inferPathType(axisId, habits) {
  const items = habits?.items || [];
  if (!items.length) return 'virgin';
  const hasPro = (PRO_TIER_ITEMS[axisId] || []).some(k => items.includes(k));
  const hairProFreq = axisId === 'hair' && ['monthly', 'bimonthly'].includes(habits?.salon_freq);
  return (hasPro || hairProFreq) ? 'doing' : 'blind';
}

export const PATH_TO_CARE_LEVEL = { virgin: 'concerned', quit: 'concerned', blind: 'self', lapsed: 'self', doing: 'pro' };
export const CARE_LEVEL_SCORE = { none: 1, concerned: 2, self: 3, self_regular: 3, pro: 4 };
