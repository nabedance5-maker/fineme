'use client';
// ブラウザから ENCOMPASS の API を呼ぶ（Fineme と同じログインを使う）。
import { freshAccessToken, signInWithPassword, timedFetch } from '@/lib/browser-auth';

export async function api(path, { method = 'GET', body } = {}) {
  const token = await freshAccessToken();
  if (!token) return { ok: false, status: 401, data: { error: 'ログインしてください', code: 'login_required' } };
  let res;
  try {
    res = await timedFetch(`/api/encompass${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 0, data: { error: 'つながりませんでした。少しおいてお試しください' } };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const login = (email, password) => signInWithPassword(email, password);

// ログアウト（この端末のログインを消す。Fineme の管理画面も同じログインなので、そちらもログアウトになる）
export function logout() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token')).forEach(k => localStorage.removeItem(k));
  } catch {}
}

export const BOARD_TOKEN = /^[A-Za-z0-9_-]{43}$/;
