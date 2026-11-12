// お店のレジで使うカードの登録（月額プランの入会以外でもカードを預かる。2026-11-12 渡邉要望）。
// ・レジのQR（1時間）と、お店がいつでも送れる登録のURL（7日間）の両方から、同じ Stripe Checkout（setup）を作る。
// ・送るURLはFinemeの短いページ（/api/card-setup?t=…）。開いた時にStripeのページを作るので、Stripeの期限（最長24時間）に縛られない。
//   中身はサーバーだけが知る鍵で署名（用途を分ける）。誰のどのお店のカードかはURLの署名から決め、ほかの値は信用しない。
// ・登録が済むと webhook（app/api/stripe/webhook）が provider_customer_cards に記録する。登録だけでは請求しない。
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { stripeCustomerFor } from '@/lib/pos-member-card';

const PURPOSE = 'store-card-setup:v1';
export const LINK_DAYS = 7;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fineme.me';

function key() {
  const s = process.env.OAUTH_STATE_SECRET || process.env.LINE_LOGIN_CHANNEL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!s) throw new Error('署名鍵が未設定です');
  return s;
}
const mac = body => createHmac('sha256', key()).update(`${PURPOSE}.${body}`).digest('base64url');

export function cardSetupLink(providerId, userId) {
  const body = Buffer.from(JSON.stringify({ p: providerId, u: userId, ts: Date.now(), n: randomBytes(6).toString('hex') })).toString('base64url');
  return `${BASE_URL}/api/card-setup?t=${body}.${mac(body)}`;
}

export function verifyCardSetupLink(t) {
  if (typeof t !== 'string' || t.length > 1000) return null;
  const i = t.lastIndexOf('.');
  if (i <= 0) return null;
  const body = t.slice(0, i);
  let expected;
  try { expected = mac(body); } catch { return null; }
  const a = Buffer.from(t.slice(i + 1)), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let d;
  try { d = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')); } catch { return null; }
  if (!d?.p || !d?.u || !d?.ts) return null;
  if (Date.now() - d.ts > LINK_DAYS * 86400000) return { expired: true };
  return { providerId: d.p, userId: d.u };
}

// Stripeのカード登録ページ（setup）を作る
export async function createCardSetupSession(supabase, stripe, provider, userId, { name } = {}) {
  const { data: { user } = {} } = await supabase.auth.admin.getUserById(userId).catch(() => ({ data: {} }));
  const email = user?.email && !/@line\.fineme\.me$|\.invalid$/.test(user.email) ? user.email : undefined;
  const customerId = await stripeCustomerFor(supabase, stripe, provider.id, userId, { email, name: name || undefined });
  const meta = { fineme_card_setup: '1', fineme_provider_id: provider.id, fineme_user_id: userId };
  return stripe.checkout.sessions.create({
    mode: 'setup',
    currency: 'jpy',
    customer: customerId,
    setup_intent_data: { metadata: meta },
    metadata: meta,
    custom_text: { submit: { message: `このカードは${provider.name}でのお会計に使えるよう保存されます。お店が会員証を読み取った時など、お店のレジでだけ使います。登録だけでは請求されません。Finemeのマイページからいつでも外せます。` } },
    success_url: `${BASE_URL}/card-registered?status=success&kind=store`,
    cancel_url: `${BASE_URL}/card-registered?status=cancel&kind=store`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  });
}
