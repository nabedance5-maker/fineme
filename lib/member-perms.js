// スタッフ個別ログインの権限（でお要望 2026-10-19：hacomonoのロールレベル相当）。
// 店舗アカウント（オーナー）は常に全権限。スタッフのログインは役割（店長・スタッフ）ごとに、
// 使えるメニューの分類を店舗が決める。画面（サイドバーの出し分け）とAPI（入口で拒否）の両方で使う。

export const PERM_DEFS = [
  { key: 'reservation', label: '予約', desc: '予約カレンダー・予約リクエスト・空き枠・チェックイン・クラス・出欠' },
  { key: 'customer', label: '顧客情報', desc: 'お客様の一覧・基本情報・カルテ・回数券・ロッカー・入会・接客の引き出し・クチコミ' },
  { key: 'broadcast', label: 'お客様への配信', desc: '一斉メール・声かけメッセージの送信' },
  { key: 'sales', label: '売上・会計', desc: '売上・レジ（POS）・請求' },
  { key: 'store', label: '店舗設定', desc: 'プロフィール・メニュー・スタッフ・営業時間・公開ページの変更' },
  { key: 'labor', label: 'シフト・勤怠', desc: 'シフト・打刻と勤怠・有給' },
  { key: 'growth', label: '集客', desc: '紹介・QR・エリア需要・LTV' },
  { key: 'account', label: 'アカウント', desc: '機能設定・LINE連携・契約・操作ログ・スタッフのログインと権限' },
];
export const PERM_KEYS = PERM_DEFS.map(p => p.key);

export const ROLE_LABEL = { owner: 'オーナー', manager: '店長', staff: 'スタッフ' };

export const DEFAULT_PERMS = {
  manager: { reservation: true, customer: true, broadcast: true, sales: true, store: true, labor: true, growth: true, account: false },
  staff: { reservation: true, customer: true, broadcast: false, sales: false, store: false, labor: true, growth: false, account: false },
};

export function normalizePerms(role, raw) {
  const base = DEFAULT_PERMS[role] || DEFAULT_PERMS.staff;
  const out = {};
  PERM_KEYS.forEach(k => { out[k] = typeof raw?.[k] === 'boolean' ? raw[k] : base[k]; });
  return out;
}

// 管理画面のタブ → 権限。サイドバーの分類（lib/dashboard-prefs.js の TAB_CATALOG の category）で決め、
// 例外だけここに書く。ホーム（今日の業務・AIコンサル等）と使い方は誰でも使える。
const TAB_EXCEPTIONS = { 'broadcast-email': 'broadcast' };
const CATEGORY_TO_PERM = { reservation: 'reservation', customer: 'customer', sales: 'sales', store: 'store', labor: 'labor', growth: 'growth', account: 'account' };
export function permOfTab(tabKey, category) {
  if (TAB_EXCEPTIONS[tabKey]) return TAB_EXCEPTIONS[tabKey];
  return CATEGORY_TO_PERM[category] || null;
}

// API のパス → 権限。write: true は「読むのは誰でも可・変更だけ制限」（他の画面が参照する一覧など）。
// 上から順に最初に当たったものを使う。当たらないものは制限しない（ホーム・共通の参照）。
const API_RULES = [
  [/^\/api\/provider\/customers\/broadcast-email/, 'broadcast'],
  [/^\/api\/provider\/broadcasts/, 'broadcast'],
  [/^\/api\/provider\/customers\/[^/]+\/nudge/, 'broadcast'],
  [/^\/api\/provider\/(members|role-permissions)/, 'account'],
  [/^\/api\/provider\/(calendar|reservations|slots|checkins|events|staff-blocks|booking-limits|closed-dates)/, 'reservation'],
  [/^\/api\/reservations(\/|$)/, 'reservation'],
  [/^\/api\/provider\/classes/, 'reservation', true],
  [/^\/api\/provider\/(customers|customer-labels|surveys|customer-profile|customer-activity|customer-packages|karte-fields|contract-documents|lockers|locker-banks|memberships|service-memos|stories|cases|dormant-settings|recommended-frequencies)/, 'customer'],
  [/^\/api\/provider\/(packages|membership-plans|membership-settings|membership-options|membership-discounts)/, 'customer', true],
  [/^\/api\/provider\/(sales-entries|pos|products|invoices|ltv-cac|ltv-cac-settings|deposit-settings|membership-billing)/, 'sales'],
  [/^\/api\/provider\/(profile|appeal-blocks|page-theme|business-hours|services|experience-menus|staff|resources|upload-photo|upload-facility-photo|upload-service-image|analyze)/, 'store', true],
  [/^\/api\/provider\/(shift-|attendance)/, 'labor'],
  [/^\/api\/provider\/(referrals|referral-settings|area-demand|sales-partner|trial-funnel)/, 'growth'],
  [/^\/api\/provider\/(line-channel|line-connect|activity-log|terms-agreement|onboarding)/, 'account'],
  [/^\/api\/provider\/features/, 'account', true],
  [/^\/api\/stripe\/connect/, 'account'],
];

export function permOfApi(pathname, method) {
  for (const [re, perm, writeOnly] of API_RULES) {
    if (!re.test(pathname)) continue;
    if (writeOnly && (method === 'GET' || method === 'HEAD')) return null;
    return perm;
  }
  return null;
}
