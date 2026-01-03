// User auth guard and session helpers (localStorage/sessionStorage demo)
const BASE_PREFIX = (location.hostname && /github\.io$/i.test(location.hostname)) ? '/fineme' : '';
const USER_SESSION_KEY = 'glowup:userSession';
const USERS_KEY = 'glowup:users';

export function getUserSession(){
  try{ const raw = sessionStorage.getItem(USER_SESSION_KEY); return raw ? JSON.parse(raw) : null; }catch{ return null; }
}

export function requireUserAuth(){
  const session = getUserSession();
  if(!session){
    location.href = BASE_PREFIX + '/pages/user/login.html';
    return null;
  }
  return session;
}

export function signOutUser(){
  try{ sessionStorage.removeItem(USER_SESSION_KEY); }catch{}
  location.href = BASE_PREFIX + '/pages/user/login.html';
}

export function loadUsers(){
  try{ const raw = localStorage.getItem(USERS_KEY); const arr = raw? JSON.parse(raw): []; return Array.isArray(arr)? arr: []; }catch{ return []; }
}

export function saveUsers(list){
  localStorage.setItem(USERS_KEY, JSON.stringify(list));
}

export function uuid(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}
