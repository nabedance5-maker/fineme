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
    label: 'スタッフ指名予約',
    group: '予約',
    defaultOn: true,
    help: 'お客様が予約時にスタッフを指名できるようにします。指名料の設定も可能です。',
  },
  resource_management: {
    label: '部屋・設備の空き管理',
    group: '予約',
    defaultOn: false,
    help: '個室やマシンなど、予約に紐づく設備の空き状況を管理します。',
  },
  instant_booking: {
    label: '即時予約（空き枠から自動確定）',
    group: '予約',
    defaultOn: false,
    help: 'オンにすると、お客様が空き枠を選んだ時点で予約が自動確定します。オフの場合は従来通り、店舗の承認を経て確定します。',
  },
  pos: {
    label: 'POS・物販・在庫管理',
    group: '売上',
    defaultOn: false,
    help: '店頭での物販・会計をFineme上で記録し、在庫も管理します。',
  },
  checkin_qr: {
    label: 'QRチェックイン',
    group: '来店管理',
    defaultOn: false,
    help: 'お客様のQRコードをカメラで読み取ってチェックインを記録します。',
  },
  attendance_confirm: {
    label: '出欠確認（イベント）',
    group: '来店管理',
    defaultOn: false,
    help: 'イベントの出欠をLINEのボタンで確認できます。',
  },
  payment_mediation: {
    label: '決済連携',
    group: '決済',
    defaultOn: false,
    help: '準備中の機能です。',
  },
};

/**
 * その店舗が指定の機能を使えるかどうかを判定する。
 * @param {{enabled_features?: object}} provider - providersテーブルの行（enabled_featuresを含む）
 * @param {keyof typeof FEATURE_DEFS} key
 * @returns {boolean}
 */
export function hasFeature(provider, key) {
  const def = FEATURE_DEFS[key];
  if (!def) return false;
  const value = provider?.enabled_features?.[key];
  return typeof value === 'boolean' ? value : def.defaultOn;
}

/**
 * 設定UI・APIレスポンス用に、未設定キーをdefaultOnで補って完全な状態を返す。
 * @param {{enabled_features?: object}} provider
 * @returns {Record<string, boolean>}
 */
export function resolveFeatures(provider) {
  const out = {};
  for (const key of Object.keys(FEATURE_DEFS)) out[key] = hasFeature(provider, key);
  return out;
}
