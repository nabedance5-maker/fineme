// 店舗のログイン用メールアドレスの変更（2026-11-12 渡邉指摘：前のアドレスが使えなくなった時は、
// 今のアドレスと新しいアドレスの両方の確認ボタンを押すことができない）。
// 今のパスワードで本人を確かめ、新しいアドレスに届いた確認リンクを押せば変わる。今のアドレスは要らない。
// リンクの中身はサーバーだけが知る鍵で署名し（用途を混ぜて、LINE連携の state とは別物にする）、1時間で期限切れ。
// 押した時点でログイン用メールが申込時と同じ（＝その後に別の変更が済んでいない）時だけ変える。
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

const PURPOSE = 'login-email-change:v1';
const MAX_AGE_MS = 60 * 60 * 1000;

function key() {
  const s = process.env.OAUTH_STATE_SECRET || process.env.LINE_LOGIN_CHANNEL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!s) throw new Error('署名鍵が未設定です');
  return s;
}
const mac = body => createHmac('sha256', key()).update(`${PURPOSE}.${body}`).digest('base64url');

export function signEmailChange({ userId, oldEmail, newEmail }) {
  const body = Buffer.from(JSON.stringify({ u: userId, o: oldEmail, e: newEmail, ts: Date.now(), n: randomBytes(8).toString('hex') })).toString('base64url');
  return `${body}.${mac(body)}`;
}

// 正しければ { userId, oldEmail, newEmail }、期限切れは { expired: true }、それ以外は null
export function verifyEmailChange(token) {
  if (typeof token !== 'string' || token.length > 2000) return null;
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const body = token.slice(0, i);
  let expected;
  try { expected = mac(body); } catch { return null; }
  const a = Buffer.from(token.slice(i + 1));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let d;
  try { d = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')); } catch { return null; }
  if (!d?.u || !d?.e || !d?.ts) return null;
  if (Date.now() - d.ts > MAX_AGE_MS) return { expired: true };
  return { userId: d.u, oldEmail: d.o || '', newEmail: d.e };
}
