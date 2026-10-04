// 店舗ごとの機能ON/OFF基盤（Phase 0・でお要望2026-09-11）。
// hacomono/STORES網羅計画で追加していく機能（スタッフ指名予約・POS・チェックイン等）は
// 店舗ごとにニーズが全く違うため、機能は一通り揃えつつ店舗が選んで使えるようにする。
// providers.enabled_features JSONB を単一の真実とし、以降の全フェーズはこのファイル経由で
// チェックする（各ルートで if(provider.plan===...) を個別実装した過去の反省を踏まえ、
// 新機能はここに1箇所追加すれば済む形にする）。
// 詳細: ~/.claude/plans/fineme-1-newme-optimized-hopcroft.md「hacomono/STORES機能網羅計画」

// key: enabled_featuresのJSONBキー
// label/group: 設定UI（掲載者ダッシュボード「⚙️ 機能設定」タブ）の表示用
// defaultOn: providers.enabled_featuresが未設定/該当キー欠落の時のフォールバック値
//            （SQLのDEFAULT句と実質同じ値にしておく＝新規store・移行前storeとも挙動を揃える）
export const FEATURE_DEFS = {
  staff_designation: {
    minPlan: 'B',
    label: 'スタッフ指名予約',
    group: '予約',
    defaultOn: true,
    help: 'お客様が予約時にスタッフを指名できるようにします。指名料の設定も可能です。',
  },
  resource_management: {
    minPlan: 'B',
    label: '部屋・設備の空き管理',
    group: '予約',
    defaultOn: false,
    help: '個室やマシンなど、予約に紐づく設備の空き状況を管理します。',
  },
  instant_booking: {
    minPlan: 'A',
    label: '即時予約（空き枠から自動確定）',
    group: '予約',
    defaultOn: false,
    help: 'オンにすると、お客様が空き枠を選んだ時点で予約が自動確定します。オフの場合は従来通り、店舗の承認を経て確定します。',
  },
  booking_request: {
    minPlan: 'A',
    label: '予約リクエスト受付（第1〜3希望→店舗が承認）',
    group: '予約',
    defaultOn: true,
    help: 'オンにすると、お客様が第1〜3希望の日時を送り、店舗が承認・代替提案・お断りで対応する従来の予約リクエストを受け付けます。即時予約のみで受け付けたい店舗はオフにできます。',
  },
  pos: {
    minPlan: 'C',
    label: 'POS・物販・在庫管理',
    group: '売上',
    defaultOn: false,
    help: '店頭での物販・会計をFineme上で記録し、在庫も管理します。',
  },
  checkin_qr: {
    minPlan: 'B',
    label: 'QRチェックイン',
    group: '来店管理',
    defaultOn: false,
    help: 'お客様のQRコードをカメラで読み取ってチェックインを記録します。',
  },
  attendance_confirm: {
    minPlan: 'B',
    label: '出欠確認（イベント）',
    group: '来店管理',
    defaultOn: false,
    help: 'イベントの出欠をLINEのボタンで確認できます。',
  },
  payment_mediation: {
    minPlan: 'A',
    label: '決済連携（予約デポジット）',
    group: '決済',
    defaultOn: false,
    help: 'オンにすると、即時予約で確定した予約にお客様の前払いデポジットを求められます（金額はこの下で設定）。オンライン決済の受け入れ（Stripe連携）が「Fineme利用契約」タブから完了している必要があります。',
  },
  shift_management: {
    minPlan: 'B',
    label: 'シフト管理',
    group: '店舗運営',
    defaultOn: false,
    help: 'スタッフが各自のスマホから出勤・休み希望を提出し、店舗側で確認・自動作成できます。',
  },
  ai_consultant: {
    minPlan: 'A',
    label: 'AI専属コンサル',
    group: '店舗運営',
    defaultOn: true,
    help: '店舗が選んだゴール（リピートしてくれるお客様を増やす・スタッフの時間を作る等）に沿って、次にやることをAIが提案します。画面右下の吹き出しと専用タブが出ます。オフにしても他の機能はそのまま使えます。',
  },
  referral_program: {
    minPlan: 'B',
    label: '友達紹介プログラム',
    group: '集客',
    defaultOn: false,
    help: 'お客様が友達を紹介できる専用リンクを発行します。紹介経由の予約・来店を自動で記録し、双方に通知します（特典の内容・付与は店舗側の運用に委ねます）。',
  },
  booking_board: {
    minPlan: 'A',
    label: '店頭予約ボード',
    group: '予約',
    defaultOn: false,
    help: '店内に設置したタブレットから、スタッフを介さずお客様自身がその場で空き枠を予約できる専用画面を使えるようにします。即時予約（instant_booking）がONの店舗向けです。',
  },
  class_management: {
    minPlan: 'B',
    label: 'クラス管理（スクール業態向け）',
    group: '店舗運営',
    defaultOn: false,
    help: 'ダンス・スイミング・空手等、定員制クラスの名簿・進級管理ができます（白帯→黒帯のような段階を店舗ごとに設定可能）。',
  },
  locker_rental: {
    minPlan: 'C',
    label: 'ロッカー月極管理',
    group: '売上',
    defaultOn: false,
    help: 'お客様が店舗のロッカーを月極で契約している状況を管理できます（決済は仲介せず、契約状況の記録のみ）。',
  },
  membership_enrollment: {
    minPlan: 'B',
    label: '入会手続き（月会費のオンライン入会）',
    group: '顧客',
    defaultOn: false,
    help: 'お客様がFineme上で入会申込〜クレジットカード登録までを完結できます。承認すると毎月自動でカード課金され、店舗のStripe Connect口座へ送金されます。利用にはStripe Connectの本人確認完了が必要です。',
  },
  posture_analysis: {
    minPlan: 'C',
    label: 'AI姿勢分析',
    group: '顧客',
    defaultOn: false,
    help: '来店時に撮影した写真をAIが分析し、姿勢のスコア・気になる癖・凝っていそうな筋肉部位を提案します。顧客ごとに記録が蓄積され、経過を追えます（撮影・記録は店舗スタッフが行い、お客様自身には見せない運用です）。',
  },
  health_advice_analysis: {
    minPlan: 'C',
    label: 'AI健診アドバイス',
    group: '顧客',
    defaultOn: false,
    help: '人間ドック等の結果写真（＋任意の補足入力）をAIが読み、食事・運動・生活習慣のアドバイスを提案します。顧客ごとに記録が蓄積されます（撮影・記録は店舗スタッフが行い、お客様自身には見せない運用です）。',
  },
  customer_packages: {
    minPlan: 'B',
    label: '回数券',
    group: '売上',
    defaultOn: true,
    help: '回数券・通い放題チケットの発行と消化を管理します。',
  },
  line_channel: {
    minPlan: 'C',
    label: '店舗別LINE連携',
    group: '集客',
    defaultOn: true,
    help: '店舗自身の公式LINEから、お客様へリマインドやメッセージを送れるようにします。',
  },
  activity_log: {
    minPlan: 'C',
    label: '操作ログ',
    group: '店舗運営',
    defaultOn: true,
    help: '誰がいつ何を操作したかの記録を確認できます。',
  },
  dormant_outreach: {
    minPlan: 'B',
    label: '休眠顧客の掘り起こし',
    group: '集客',
    defaultOn: true,
    help: '最終来店から間があいたお客様を一覧し、個別に声かけできます。',
  },
  review_request: {
    minPlan: 'B',
    label: 'クチコミ依頼の自動化',
    group: '集客',
    defaultOn: true,
    help: '来店後、自動でクチコミ投稿のお願いをお客様へ送ります。',
  },
  karte_ai: {
    minPlan: 'C',
    label: 'カルテAI分析',
    group: '顧客',
    defaultOn: true,
    help: '過去のカルテ記録からAIが傾向と次回への提案を出します。',
  },
};

export const PLAN_ORDER = ['A', 'B', 'C'];

// special（無料の特別アカウント）は最上位扱い。planが未設定/不明ならAとして扱う。
export function planRank(plan) {
  if (plan === 'special') return PLAN_ORDER.length - 1;
  const i = PLAN_ORDER.indexOf(plan);
  return i < 0 ? 0 : i;
}

/** 特例無料（special）のアカウントだけ、見え方確認用に別プランとして扱う（契約・課金は変わらない）。 */
export function withPlanPreview(provider, preview) {
  if (!provider || provider.plan !== 'special') return provider;
  return PLAN_ORDER.includes(preview) ? { ...provider, plan: preview } : provider;
}

/**
 * プランが機能の最低プランを満たすか。providerにplanキー自体が無い（SELECTしていない）時は
 * 判定できないため許可側に倒す（判定の必要な箇所はplanをSELECTに含める）。
 */
export function planAllows(provider, key) {
  const def = FEATURE_DEFS[key];
  if (!def) return false;
  if (!provider || !('plan' in provider)) return true;
  return planRank(provider.plan) >= planRank(def.minPlan || 'A');
}

/**
 * その店舗が指定の機能を使えるかどうかを判定する（プラン下限＋店舗のON/OFF）。
 * @param {{enabled_features?: object, plan?: string}} provider - providersテーブルの行
 * @param {keyof typeof FEATURE_DEFS} key
 * @returns {boolean}
 */
export function hasFeature(provider, key) {
  const def = FEATURE_DEFS[key];
  if (!def) return false;
  if (!planAllows(provider, key)) return false;
  const value = provider?.enabled_features?.[key];
  return typeof value === 'boolean' ? value : def.defaultOn;
}

/** 機能ごとの最低プラン（ダッシュボードの「Bプラン以上」表示用）。 */
export function featureLocks(provider) {
  const out = {};
  for (const [key, def] of Object.entries(FEATURE_DEFS)) {
    if (!planAllows(provider, key)) out[key] = def.minPlan || 'A';
  }
  return out;
}

/**
 * 設定UI・APIレスポンス用に、未設定キーをdefaultOnで補って完全な状態を返す（プラン下限は加味しない＝
 * 店舗のON/OFF設定そのもの。プラン不足はfeatureLocksで別に返す）。
 * @param {{enabled_features?: object}} provider
 * @returns {Record<string, boolean>}
 */
export function resolveFeatures(provider) {
  const out = {};
  for (const key of Object.keys(FEATURE_DEFS)) {
    const value = provider?.enabled_features?.[key];
    out[key] = typeof value === 'boolean' ? value : FEATURE_DEFS[key].defaultOn;
  }
  return out;
}
