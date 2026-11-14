// 営業用のデモアカウント（2026-11-14）。デモ店舗のログインと、デモのお客様は、すべて demo.fineme.me のアドレス。
// このドメインは受信できない（MXなし）ため、どこかで送信を止め忘れても届かない。送信の入口（lib/email.js・lib/line-push.js）でも捨てる。
export const DEMO_DOMAIN = 'demo.fineme.me';
export const DEMO_STORE_EMAIL = `demo-store@${DEMO_DOMAIN}`;
export const DEMO_SLUG = 'demo-store';

export function isDemoEmail(email) {
  return /@demo\.fineme\.me$/i.test(String(email || '').trim());
}

// Bearer トークンの中身（署名は確かめない）。デモと判定すると「止める」側にしか働かないため、偽装されても困らない
export function demoClaimsFromAuth(authHeader) {
  const raw = String(authHeader || '');
  if (!raw.startsWith('Bearer ')) return null;
  try {
    const part = raw.slice(7).split('.')[1];
    const json = typeof atob === 'function'
      ? atob(part.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((part.length + 3) % 4))
      : Buffer.from(part, 'base64url').toString('utf8');
    const c = JSON.parse(json);
    return c && isDemoEmail(c.email) ? c : null;
  } catch { return null; }
}

// デモで止める API（書き込み）。外に出る送信・お金・アカウント・実在の人の情報に触るもの
const BLOCK_WRITE = [
  /^\/api\/provider\/account-settings(\/|$)/,       // ログインメール・パスワード・通知先
  /^\/api\/provider\/members(\/|$)/,                // スタッフの招待（メールが届く）
  /^\/api\/provider\/line-(connect|callback|channel)(\/|$)/,
  /^\/api\/provider\/signup(\/|$)/,
  /^\/api\/provider\/sales-partner(\/|$)/,
  /^\/api\/provider\/customer-card-link(\/|$)/,
  /^\/api\/provider\/pos\/(card-setup|card-checkout|online-checkout|receipt-email)(\/|$)/,
  /^\/api\/provider\/memberships\/[^/]+\/card(\/|$)/,
  /^\/api\/provider\/membership-billing(\/|$)/,
  /^\/api\/provider\/invoices(\/|$)/,
  /^\/api\/provider\/customers\/register(\/|$)/,    // 実在のメールでアカウントを作ってしまう
  /^\/api\/provider\/customers\/manual\/[^/]+\/account(\/|$)/,
  /^\/api\/provider\/shift-submissions\/send-links(\/|$)/,
  /^\/api\/provider\/import\//,                     // 実在のお客様の名簿を共有のデモに入れさせない
  /^\/api\/provider\/upload-/,                      // 写真のアップロード（共有の場に画像を置かせない）
  /^\/api\/provider\/events\/upload-image(\/|$)/,
  /^\/api\/provider\/staff\/[^/]+\/gallery(\/|$)/,
  /^\/api\/provider\/membership-settings\/terms-file(\/|$)/,
  /^\/api\/provider\/consultant\/web(\/|$)/,         // 外のサイトを読みに行く
  /^\/api\/stripe\//,
  /^\/api\/reservations\/?$/,                     // お客様として本物のお店に予約を入れさせない
  /^\/api\/reservations\/by-contact(\/|$)/,
];
// デモでは読むのも止める API（Fineme 全体の会員を探す・Stripe の画面）
const BLOCK_READ = [
  /^\/api\/provider\/customers\/search-member(\/|$)/,
  /^\/api\/stripe\/connect\//,
];
// AI を呼ぶ API（デモ全体で1時間あたりの回数に上限）
const AI_PATHS = [
  /^\/api\/provider\/consultant\/(chat|plan|review)(\/|$)/,
  /^\/api\/provider\/customers\/[^/]+\/karte-insight(\/|$)/,
  /^\/api\/provider\/service-memos\/ai(\/|$)/,
  /^\/api\/provider\/analyze(\/|$)/,
  /^\/api\/provider\/customers\/(manual\/)?[^/]+\/(posture|health-advice)-entries(\/|$)/,
];
export const DEMO_AI_PER_HOUR = 80;

export function demoBlockReason(pathname, method) {
  const write = !['GET', 'HEAD', 'OPTIONS'].includes(String(method || 'GET').toUpperCase());
  if (BLOCK_READ.some(r => r.test(pathname))) return 'blocked';
  if (write && BLOCK_WRITE.some(r => r.test(pathname))) return 'blocked';
  if (write && AI_PATHS.some(r => r.test(pathname))) return 'ai';
  return null;
}
