// User auth helpers — Supabase Auth 対応版
// getUserSession() は同期API（後方互換維持）
// Supabase v2 が localStorage に保存するセッションを直接読み取る
import { supabase } from './supabase.js';

const BASE_PREFIX = (location.hostname && /github\.io$/i.test(location.hostname)) ? '/fineme' : '';
const SB_KEY = 'sb-qsfpzlvucqzmjldshwwd-auth-token';

// ---- 同期セッション取得（Supabase localStorage から直読み） ----
function _readSbSession() {
  try {
    const raw = localStorage.getItem(SB_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const user = data?.user;
    if (!user) return null;
    const expiresAt = data?.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now()) return null;
    return {
      id: user.id,
      loginId: user.email,
      email: user.email,
      displayName: user.user_metadata?.display_name || user.email,
      signedInAt: Date.now(),
    };
  } catch { return null; }
}

// キャッシュ（同期呼び出し用）
let _cache = _readSbSession();

// 認証状態が変わったらキャッシュを更新
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    _cache = {
      id: session.user.id,
      loginId: session.user.email,
      email: session.user.email,
      displayName: session.user.user_metadata?.display_name || session.user.email,
      signedInAt: Date.now(),
    };
  } else {
    _cache = null;
  }
});

export function getUserSession() {
  return _cache;
}

export function requireUserAuth() {
  const session = getUserSession();
  if (!session) {
    location.href = BASE_PREFIX + '/pages/user/login.html';
    return null;
  }
  return session;
}

export async function signOutUser() {
  await supabase.auth.signOut();
  _cache = null;
  location.href = BASE_PREFIX + '/pages/user/login.html';
}

// ---- 後方互換スタブ（mypage-profile.js が移行完了したら削除） ----
export function loadUsers() { return []; }
export function saveUsers() {}

export function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
