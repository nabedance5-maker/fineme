// My Page: user profile prefill and save — Supabase 対応版
import { supabase } from './supabase.js';
import { requireUserAuth } from './user-auth.js';

function $(s, root = document) { return root.querySelector(s); }

function isValidEmail(email) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
}

async function prefill() {
  const session = requireUserAuth();
  if (!session) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const nameEl = $('#profile-displayName');
  const emailEl = $('#profile-email');
  const bioEl = $('#profile-bio');

  if (nameEl) nameEl.value = user.user_metadata?.display_name || '';
  if (emailEl) emailEl.value = user.email || '';

  // bio は profiles テーブルから取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('bio')
    .eq('id', user.id)
    .single();
  if (bioEl && profile?.bio) bioEl.value = profile.bio;
}

async function onSubmit(e) {
  e.preventDefault();
  const session = requireUserAuth();
  if (!session) return;

  const msg = $('#profile-message');
  const nameEl = /** @type {HTMLInputElement|null} */($('#profile-displayName'));
  const emailEl = /** @type {HTMLInputElement|null} */($('#profile-email'));
  const bioEl = /** @type {HTMLTextAreaElement|null} */($('#profile-bio'));

  const displayName = nameEl ? nameEl.value.trim() : '';
  const email = emailEl ? emailEl.value.trim() : '';
  const bio = bioEl ? bioEl.value : '';

  if (!displayName) { if (msg) msg.textContent = '名前は必須です。'; return; }
  if (!isValidEmail(email)) { if (msg) msg.textContent = 'メールアドレスの形式が正しくありません。'; return; }

  // display_name を Supabase Auth メタデータに保存
  const { error: authError } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });
  if (authError) { if (msg) msg.textContent = `更新に失敗しました: ${authError.message}`; return; }

  // bio を profiles テーブルに保存
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: session.id, display_name: displayName, bio, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (profileError) { if (msg) msg.textContent = `プロフィール保存エラー: ${profileError.message}`; return; }

  if (msg) msg.textContent = '保存しました。';
}

document.addEventListener('DOMContentLoaded', () => {
  prefill();
  const form = document.getElementById('user-profile-form');
  if (form) form.addEventListener('submit', onSubmit);
});
