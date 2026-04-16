import { loadUsers, saveUsers, uuid } from './user-auth.js';
const BASE_PREFIX = (location.hostname && /github\.io$/i.test(location.hostname)) ? '/fineme' : '';

function qs(s, root=document){ return root.querySelector(s); }

function switchTab(which){
  const loginTab = qs('#tab-login');
  const regTab = qs('#tab-register');
  const loginForm = qs('#login-form');
  const regForm = qs('#register-form');
  const isLogin = which === 'login';
  loginTab.classList.toggle('is-active', isLogin);
  regTab.classList.toggle('is-active', !isLogin);
  loginTab.setAttribute('aria-selected', String(isLogin));
  regTab.setAttribute('aria-selected', String(!isLogin));
  loginForm.style.display = isLogin ? '' : 'none';
  regForm.style.display = isLogin ? 'none' : '';
}

function setUserSession(user){
  const session = { id: user.id, loginId: user.loginId, displayName: user.displayName || user.loginId, signedInAt: Date.now() };
  sessionStorage.setItem('glowup:userSession', JSON.stringify(session));
}

function onLoginSubmit(e){
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const loginId = (fd.get('loginId')||'').toString().trim();
  const password = (fd.get('password')||'').toString();
  const msg = qs('#login-message');
  const users = loadUsers();
  const found = users.find(u => (u.loginId||'').toLowerCase() === loginId.toLowerCase());
  if(!found || found.passwordHash !== password){
    if(msg){ msg.textContent = 'ID またはパスワードが正しくありません。'; msg.classList.add('error'); }
    return;
  }
  setUserSession(found);
  // Sync user to server DB for PoC
  // Skip server sync on GitHub Pages
  try{ if(!/github\.io$/i.test(location.hostname)) fetch('http://localhost:4015/api/sync-user', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ loginId: found.loginId, displayName: found.displayName, email: found.email, passwordHash: found.passwordHash }) }).catch(()=>{}); }catch(_){ }
  // after login, if a `next` param exists, redirect there to resume booking
  try{
    const next = new URLSearchParams(location.search).get('next');
    if(next){ location.replace(decodeURIComponent(next)); return; }
  }catch(_){}
  // after login, if a pending LINE link exists, attempt to link by calling server
  try{ const pending = sessionStorage.getItem('pendingLineLink'); if(pending && !/github\.io$/i.test(location.hostname)){ fetch('http://localhost:4015/api/link-line', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ loginId: found.loginId, lineUserId: pending }) }).then(()=>{ sessionStorage.removeItem('pendingLineLink'); }).catch(()=>{}); } }catch(_){ }
  location.href = BASE_PREFIX + '/pages/mypage/index.html';
}

function onRegisterSubmit(e){
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const displayName = (fd.get('displayName')||'').toString().trim();
  const loginId = (fd.get('loginId')||'').toString().trim();
  const password = (fd.get('password')||'').toString();
  const msg = qs('#register-message');
  if(!displayName || !loginId || !password){
    if(msg) msg.textContent = '必須項目が未入力です。';
    return;
  }
  const users = loadUsers();
  if(users.some(u => (u.loginId||'').toLowerCase() === loginId.toLowerCase())){
    if(msg) msg.textContent = 'そのログインIDは既に使用されています。';
    return;
  }
  // loginId をメールとして扱うため、初期 email にも保存
  const user = { id: uuid(), displayName, loginId, email: loginId, passwordHash: password, createdAt: new Date().toISOString() };
  users.push(user);
  saveUsers(users);
  setUserSession(user);
  // Sync newly registered user to server DB
  try{ if(!/github\.io$/i.test(location.hostname)) fetch('http://localhost:4015/api/sync-user', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ loginId: user.loginId, displayName: user.displayName, email: user.email, passwordHash: user.passwordHash }) }).catch(()=>{}); }catch(_){ }
  try{
    const next = new URLSearchParams(location.search).get('next');
    if(next){ location.replace(decodeURIComponent(next)); return; }
  }catch(_){}
  location.href = BASE_PREFIX + '/pages/mypage/index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const loginTab = qs('#tab-login');
  const regTab = qs('#tab-register');
  const loginForm = qs('#login-form');
  const regForm = qs('#register-form');
  if(loginTab) loginTab.addEventListener('click', () => switchTab('login'));
  if(regTab) regTab.addEventListener('click', () => switchTab('register'));
  if(loginForm) loginForm.addEventListener('submit', onLoginSubmit);
  if(regForm) regForm.addEventListener('submit', onRegisterSubmit);
  // If the URL hash is #register, open the register tab automatically
  if(location.hash === '#register'){
    try{ switchTab('register'); }catch(_){}
  }
});
