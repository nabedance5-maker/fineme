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

export async function freshAccessToken() {
  try {
    const { data: { session } } = await sb().auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}
