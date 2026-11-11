// LINEログイン・LINE連携（OAuth）の state に署名を付ける・確かめる。
//
// 2026-11-11 セキュリティ点検：以前の state は JSON を base64 にしただけで、誰でも作れた。
// そのため「link_user_id＝他人のユーザーID」「provider_id＝他の店舗のID」の state を自分で作って
// LINEログインを通すと、他人のアカウント・店舗に自分のLINEが結びつき、その人宛ての通知
// （予約内容・Mirrorの結果など個人情報を含む）を受け取れてしまった。
// いまは state をサーバーだけが知る鍵（LINE_LOGIN_CHANNEL_SECRET）で署名し、
// コールバックでは署名が合い、10分以内に作られた state だけを受け付ける。
// 連携する相手（ユーザー・店舗）は、ログインの印（Bearer）からサーバー側で決める（URLの値は信用しない）。
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

const MAX_AGE_MS = 10 * 60 * 1000;

function secret() {
  const s = process.env.OAUTH_STATE_SECRET || process.env.LINE_LOGIN_CHANNEL_SECRET || '';
  if (!s) throw new Error('state の署名鍵が未設定です');
  return s;
}

const sign = body => createHmac('sha256', secret()).update(body).digest('base64url');

export function signState(data) {
  const body = Buffer.from(JSON.stringify({ ...data, ts: Date.now(), n: randomBytes(8).toString('hex') })).toString('base64url');
  return `${body}.${sign(body)}`;
}

// 署名が合わない・形が違う → null。期限切れ → { expired: true }
export function verifyState(state) {
  if (typeof state !== 'string' || state.length > 4000) return null;
  const i = state.lastIndexOf('.');
  if (i <= 0) return null;
  const body = state.slice(0, i);
  const mac = state.slice(i + 1);
  let expected;
  try { expected = sign(body); } catch { return null; }
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')); } catch { return null; }
  if (!data || typeof data.ts !== 'number') return null;
  if (Date.now() - data.ts > MAX_AGE_MS || data.ts - Date.now() > 60 * 1000) return { expired: true };
  return data;
}

// LINEの認可画面のURL
export function lineAuthorizeUrl({ redirectUri, state, botPrompt = false }) {
  const url = new URL('https://access.line.me/oauth2/v2.1/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', process.env.LINE_LOGIN_CHANNEL_ID || '');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('scope', 'profile');
  if (botPrompt) url.searchParams.set('bot_prompt', 'aggressive');
  return url.toString();
}
