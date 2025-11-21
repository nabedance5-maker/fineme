// My Page: user profile prefill and save
import { requireUserAuth, loadUsers, saveUsers } from './user-auth.js';

function $(s, root=document){ return root.querySelector(s); }

function findCurrentUser(users, session){
  if(!session) return null;
  const idx = users.findIndex(u => u.id === session.id);
  return { idx, user: idx>=0 ? users[idx] : null };
}

function isValidEmail(email){
  const re = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return re.test(email);
}

function prefill(){
  const session = requireUserAuth(); if(!session) return;
  const users = loadUsers();
  const { user } = findCurrentUser(users, session);
  const nameEl = $('#profile-displayName');
  const emailEl = $('#profile-email');
  const bioEl = $('#profile-bio');
  if(nameEl && user) nameEl.value = user.displayName || '';
  if(emailEl && user) emailEl.value = user.email || user.loginId || '';
  if(bioEl && user) bioEl.value = user.bio || '';
}

function onSubmit(e){
  e.preventDefault();
  const session = requireUserAuth(); if(!session) return;
  const users = loadUsers();
  const { idx, user } = findCurrentUser(users, session);
  const msg = $('#profile-message');
  if(idx < 0 || !user){ if(msg) msg.textContent = 'ユーザー情報が見つかりません。'; return; }
  const nameEl = /** @type {HTMLInputElement|null} */($('#profile-displayName'));
  const emailEl = /** @type {HTMLInputElement|null} */($('#profile-email'));
  const bioEl = /** @type {HTMLTextAreaElement|null} */($('#profile-bio'));
  const displayName = nameEl? nameEl.value.trim() : '';
  let email = emailEl? emailEl.value.trim() : '';
  if(!email) email = user.loginId || '';
  const bio = bioEl? bioEl.value : '';
  // simple validation
  if(!displayName){ if(msg) msg.textContent = '名前は必須です。'; return; }
  // メール形式チェック
  if(!isValidEmail(email)){ if(msg) msg.textContent = 'メールアドレスの形式が正しくありません。'; return; }
  // 重複チェック（他ユーザーの email / loginId と衝突しないか）
  const emailLower = email.toLowerCase();
  const conflict = users.some(u => u.id !== user.id && (
    (u.email && u.email.toLowerCase() === emailLower) ||
    (u.loginId && u.loginId.toLowerCase() === emailLower)
  ));
  if(conflict){ if(msg) msg.textContent = 'そのメールアドレスは既に使用されています。'; return; }
  // update and persist
  users[idx] = { ...user, displayName, email, bio, updatedAt: new Date().toISOString() };
  saveUsers(users);
  // Also update session displayName for header
  try{
    const raw = sessionStorage.getItem('glowup:userSession');
    if(raw){ const s = JSON.parse(raw); s.displayName = displayName; sessionStorage.setItem('glowup:userSession', JSON.stringify(s)); }
  }catch{}
  // Do not modify header display name — header should not show user names.
  if(msg){ msg.textContent = '保存しました。'; }
}

document.addEventListener('DOMContentLoaded', ()=>{
  prefill();
  const form = document.getElementById('user-profile-form');
  if(form) form.addEventListener('submit', onSubmit);
});
