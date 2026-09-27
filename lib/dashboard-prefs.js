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

// タブのカテゴリー所属・カテゴリー内の並び順（でお要望2026-09-27：「クラス管理は、予約の
// タブ内の方がしっくりくる気がした。ただ、これは個人の感覚や店舗ごとの便宜の差があると
// 思うので…タブの並びやどのタブにどの項目を入れるかなどのカスタム性をもっと自由に
// できるといい。デフォルトは今決めたやつでいいけど」）。上のsidebar_orderは8カテゴリー
// 自体の並び順のみを扱うのに対し、こちらは「個々のタブがどのカテゴリーに属し、
// カテゴリー内でどの順で並ぶか」を店舗ごとに上書きできるようにする。
// key: data-tab値, category: デフォルトの所属カテゴリー（CATEGORY_DEFSのkey）
// 「非表示（hidden）」は機能フラグOFFのタブを一時的にまとめる専用のシステム領域のため、
// ここでの移動先カテゴリーには含めない（機能フラグの管理はlib/feature-flags.js側）。
export const TAB_CATALOG = [
  { key: 'calendar', category: 'reservation', label: '予約カレンダー' },
  { key: 'requests', category: 'reservation', label: '予約リクエスト' },
  { key: 'slots', category: 'reservation', label: '空き枠' },
  { key: 'checkin', category: 'reservation', label: 'チェックイン' },
  { key: 'events', category: 'reservation', label: '出欠確認' },
  { key: 'today', category: 'home', label: '今日の業務' },
  { key: 'stats', category: 'home', label: '概況' },
  { key: 'customers', category: 'customer', label: '顧客管理' },
  { key: 'broadcast-email', category: 'customer', label: '一斉メール配信' },
  { key: 'reviews', category: 'customer', label: 'クチコミ' },
  { key: 'visit-settings', category: 'customer', label: '来店設定' },
  { key: 'packages', category: 'customer', label: '回数券' },
  { key: 'lockers', category: 'customer', label: 'ロッカー管理' },
  { key: 'memberships', category: 'customer', label: '入会手続き' },
  { key: 'sales', category: 'sales', label: '売上管理' },
  { key: 'pos', category: 'sales', label: 'POS・在庫' },
  { key: 'profile', category: 'store', label: '店舗プロフィール' },
  { key: 'business-hours', category: 'store', label: '営業時間' },
  { key: 'service', category: 'store', label: 'サービス設定' },
  { key: 'staff', category: 'store', label: 'スタッフ' },
  { key: 'shift', category: 'store', label: 'シフト管理' },
  { key: 'classes', category: 'store', label: 'クラス管理' },
  { key: 'resources', category: 'store', label: '部屋・設備' },
  { key: 'stories', category: 'store', label: '体験談' },
  { key: 'landing', category: 'store', label: 'LP設定（説明文）' },
  { key: 'publish', category: 'store', label: '公開設定' },
  { key: 'area-demand', category: 'growth', label: 'エリア需要' },
  { key: 'scripts', category: 'growth', label: '営業台本' },
  { key: 'ltv-cac', category: 'growth', label: 'LTV/CAC' },
  { key: 'referral', category: 'growth', label: '紹介QR' },
  { key: 'qr', category: 'growth', label: 'QRコード' },
  { key: 'member-referral', category: 'growth', label: '友達紹介プログラム' },
  { key: 'line-channel', category: 'account', label: 'LINE連携' },
  { key: 'billing', category: 'account', label: '課金・プラン' },
  { key: 'features', category: 'account', label: '機能設定' },
  { key: 'display-settings', category: 'account', label: '表示設定' },
  { key: 'tutorial', category: 'tutorial', label: '使い方' },
];
const TAB_KEYS = TAB_CATALOG.map(t => t.key);
const MOVABLE_CATEGORY_KEYS = CATEGORY_DEFS.map(c => c.key); // 'hidden'は機能フラグ専用のためここには含まれない

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
// でお要望2026-09-14：「スタッフ別と部屋別を合体させたやつも欲しくて、デフォルトはそれを表示」。
export const CALENDAR_DEFAULT_VIEW_OPTIONS = [
  { key: 'combined', label: 'スタッフ×部屋（合体表示）を先に表示（現在のデフォルト）' },
  { key: 'staff', label: 'スタッフ別を先に表示' },
  { key: 'resource', label: '部屋・設備別を先に表示' },
];
export const DEFAULT_CALENDAR_VIEW = 'combined';

// ヘッダー（モバイル用トップバー）に置けるショートカット候補（でお要望2026-09-14：
// 「よく使うメニューを3つくらいここ（ヘッダー）に置いてあげると使いやすいかもね。
// カスタムできたらもっといいね」）。サイドバーを開かなくても主要タブへ直接飛べる。
export const HEADER_SHORTCUT_OPTIONS = [
  { key: 'calendar', label: '予約カレンダー' },
  { key: 'requests', label: '予約リクエスト' },
  { key: 'customers', label: '顧客管理' },
  { key: 'sales', label: '売上管理' },
  { key: 'service', label: 'サービス設定' },
  { key: 'staff', label: 'スタッフ' },
  { key: 'landing', label: 'LP設定（説明文）' },
  { key: 'features', label: '機能設定' },
  { key: 'display-settings', label: '表示設定' },
];
// でお要望2026-09-14の例（「予約スケジュール、説明、設定」）に沿った既定値
export const DEFAULT_HEADER_SHORTCUTS = ['calendar', 'landing', 'features'];
export const MAX_HEADER_SHORTCUTS = 3;

function isValidHeaderShortcuts(arr) {
  return Array.isArray(arr) &&
    arr.length <= MAX_HEADER_SHORTCUTS &&
    arr.every(k => HEADER_SHORTCUT_OPTIONS.some(o => o.key === k));
}

function isValidSidebarOrder(arr) {
  return Array.isArray(arr) &&
    arr.length === DEFAULT_SIDEBAR_ORDER.length &&
    DEFAULT_SIDEBAR_ORDER.every(k => arr.includes(k));
}

// { [tabKey]: categoryKey } — デフォルトと異なる所属先だけを持つ（差分のみ保存）。
export function isValidTabCategoryOverrides(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Object.entries(obj).every(([tabKey, categoryKey]) =>
    TAB_KEYS.includes(tabKey) && MOVABLE_CATEGORY_KEYS.includes(categoryKey));
}

// { [categoryKey]: [tabKey, ...] } — カテゴリー内の並び順を明示的に指定したものだけを持つ。
// 未掲載のタブはこの配列の末尾にデフォルト順で続く扱い（表示側で補う）ため、
// 完全な集合である必要はない。
export function isValidTabOrderOverrides(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  return Object.entries(obj).every(([categoryKey, order]) =>
    MOVABLE_CATEGORY_KEYS.includes(categoryKey) &&
    Array.isArray(order) && order.length <= TAB_KEYS.length &&
    order.every(k => TAB_KEYS.includes(k)));
}

// 予約カレンダー「スタッフ×部屋」合体ビューの列の並び順（でお要望2026-09-17：
// 「まとまってるところの順番を自由に変えられるように。部屋が先に表示できるとか」）。
// スタッフ・部屋は店舗ごとに増減する動的データのため、固定の選択肢リストでは
// 検証できない——"staff:<id>" / "resource:<id>" のトークン配列を、形式だけ
// 緩く検証して受け付ける（実在チェックは表示側で行い、存在しないIDは無視する）。
function isValidColumnOrder(arr) {
  return Array.isArray(arr) &&
    arr.length <= 200 &&
    arr.every(k => typeof k === 'string' && (k.startsWith('staff:') || k.startsWith('resource:')));
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
    header_shortcuts: isValidHeaderShortcuts(p.header_shortcuts) ? p.header_shortcuts : DEFAULT_HEADER_SHORTCUTS,
    calendar_column_order: isValidColumnOrder(p.calendar_column_order) ? p.calendar_column_order : [],
    tab_category_overrides: isValidTabCategoryOverrides(p.tab_category_overrides) ? p.tab_category_overrides : {},
    tab_order_overrides: isValidTabOrderOverrides(p.tab_order_overrides) ? p.tab_order_overrides : {},
  };
}

// タブの実際の所属カテゴリーを返す（上書きが無ければTAB_CATALOGの既定値）。
export function categoryOfTab(tabKey, tabCategoryOverrides) {
  return tabCategoryOverrides?.[tabKey] || TAB_CATALOG.find(t => t.key === tabKey)?.category || null;
}
