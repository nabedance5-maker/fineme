'use client';
// ブラウザでログイン中のお客様のアクセストークンを取る（期限切れなら自動で更新する）。
// 予約などサーバーが本人をトークンで確かめるAPIに送る時に使う（でお要望 2026-10-21）。
// localStorage に入っている古いトークンをそのまま送ると、期限切れで本人と確認できないことがあるため。
import { createClient } from '@supabase/supabase-js';

let client = null;
function sb() {
  if (!client) {
    client = createClient(
      'https://qsfpzlvucqzmjldshwwd.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8'
    );
  }
  return client;
}

async function sessionToken() {
  try {
    const { data: { session } } = await sb().auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

// localStorage のトークンがまだ有効ならそれを使い、切れている時だけ更新する。
// 同じページに Supabase のクライアントが複数あると getSession が返ってこないことがあり、
// マイページのホームやお店のページの会員タブが「読み込み中」のまま止まったため、待つのは最大4秒にする（2026-10-22）。
export async function freshAccessToken() {
  let stored = null;
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    const obj = key ? JSON.parse(localStorage.getItem(key)) : null;
    if (obj?.user?.id && obj.access_token) {
      stored = obj.access_token;
      if ((obj.expires_at || 0) * 1000 > Date.now() + 60000) return stored;
    }
  } catch {}
  const fresh = await Promise.race([sessionToken(), new Promise(r => setTimeout(() => r(null), 4000))]);
  return fresh || stored;
}

