// 掲載者ダッシュボードの表示カスタマイズ基盤（でお要望2026-09-13）。
// 「起動時に開くタブ」「サイドバーのカテゴリー並び順」「予約カレンダーの向き（縦/横）」
// 「カレンダーの初期表示（スタッフ別/部屋別）」は店舗によってニーズが分かれるため、
// 今実装している構成をデフォルトにしつつ、店舗ごとに変更できるようにする。
// providers.dashboard_prefs JSONB を単一の真実とし、lib/feature-flags.js と同じ設計方針
// （このファイルが唯一の定義元・resolve関数で未設定キーをデフォルト値で補う）。

// サイドバー（2ペイン・カテゴリー帯）の並び順。並べ替えUIの初期値・妥当性チェックにも使う。
// でお要望2026-09-13：毎日一番触るのは予約まわりのため、既定の並び順は「予約」を
// 先頭にする（CATEGORY_DEFS自体はラベル一覧・並び替えUIの初期表示用に元の分類順で持ち、
// 既定の並び順はDEFAULT_SIDEBAR_ORDERで別途「予約」を先頭に組み替える）。
export const CATEGORY_DEFS = [
  { key: 'home', label: 'ホーム' },
  { key: 'reservation', label: '予約' },
  { key: 'customer', label: '顧客' },
  { key: 'sales', label: '売上' },
  { key: 'store', label: '店舗設定' },
  { key: 'growth', label: '集客' },
  { key: 'account', label: 'アカウント' },
  { key: 'tutorial', label: '使い方' },
];
export const DEFAULT_SIDEBAR_ORDER = ['reservation', 'home', 'customer', 'sales', 'store', 'growth', 'account', 'tutorial'];

// 起動時に開くタブ。業務で毎日最初に見る画面が店舗によって違うため選べるようにする。
export const LANDING_TAB_OPTIONS = [
  { key: 'today', label: 'ホーム（今日の業務）' },
  { key: 'calendar', label: '予約カレンダー' },
  { key: 'requests', label: '予約リクエスト' },
  { key: 'customers', label: '顧客管理' },
  { key: 'sales', label: '売上管理' },
];
// でお要望2026-09-13：ログイン後、まず開くのを予約カレンダーにする
export const DEFAULT_LANDING_TAB = 'calendar';

// 予約カレンダーの軸の向き。
export const CALENDAR_AXIS_OPTIONS = [
  { key: 'time-y', label: '時間を縦軸に表示（現在のデフォルト）' },
  { key: 'time-x', label: '時間を横軸に表示' },
];
export const DEFAULT_CALENDAR_AXIS = 'time-y';

// 予約カレンダーを開いた時に最初に見えるビュー（部屋・設備管理がONの店舗のみ意味を持つ）。
export const CALENDAR_DEFAULT_VIEW_OPTIONS = [
  { key: 'staff', label: 'スタッフ別を先に表示（現在のデフォルト）' },
  { key: 'resource', label: '部屋・設備別を先に表示' },
];
export const DEFAULT_CALENDAR_VIEW = 'staff';

function isValidSidebarOrder(arr) {
  return Array.isArray(arr) &&
    arr.length === DEFAULT_SIDEBAR_ORDER.length &&
    DEFAULT_SIDEBAR_ORDER.every(k => arr.includes(k));
}

/**
 * 設定UI・ダッシュボード起動時の適用、両方から使う：未設定キーをデフォルト値で補って返す。
 * @param {{dashboard_prefs?: object}} provider
 */
export function resolveDashboardPrefs(provider) {
  const p = provider?.dashboard_prefs || {};
  return {
    landing_tab: LANDING_TAB_OPTIONS.some(o => o.key === p.landing_tab) ? p.landing_tab : DEFAULT_LANDING_TAB,
    sidebar_order: isValidSidebarOrder(p.sidebar_order) ? p.sidebar_order : DEFAULT_SIDEBAR_ORDER,
    calendar_axis: CALENDAR_AXIS_OPTIONS.some(o => o.key === p.calendar_axis) ? p.calendar_axis : DEFAULT_CALENDAR_AXIS,
    calendar_default_view: CALENDAR_DEFAULT_VIEW_OPTIONS.some(o => o.key === p.calendar_default_view) ? p.calendar_default_view : DEFAULT_CALENDAR_VIEW,
  };
}
