// Provider auth guard and session helpers
const BASE_PREFIX = (location.hostname && /github\.io$/i.test(location.hostname)) ? '/fineme' : '';
const PROVIDER_SESSION_KEY = 'glowup:providerSession';

export function getProviderSession(){
  try{ const raw = sessionStorage.getItem(PROVIDER_SESSION_KEY); return raw ? JSON.parse(raw) : null; }catch{ return null; }
}

export function requireProviderAuth(){
  const session = getProviderSession();
  if(!session){
    // not logged-in -> redirect to login page
    location.href = BASE_PREFIX + '/pages/login.html';
    return null;
  }
  return session;
}

export function signOutProvider(){
  sessionStorage.removeItem('glowup:providerLoggedIn');
  sessionStorage.removeItem(PROVIDER_SESSION_KEY);
  location.href = BASE_PREFIX + '/pages/login.html';
}
