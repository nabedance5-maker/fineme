export {};
// Login against providers created in Admin (localStorage)
function qs(s, el=document){ return el.querySelector(s); }
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
const BASE_PREFIX = (location.hostname && /github\.io$/i.test(location.hostname)) ? '/fineme' : '';

const PROVIDERS_KEY = 'glowup:providers';
const SESSION_KEY = 'glowup:providerSession';

function loadProviders(){
  try{
    const raw = localStorage.getItem(PROVIDERS_KEY);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}

(function init(){
  const form = qs('#login-form');
  const msg = qs('#login-message');
  if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const email = (fd.get('email')||'').toString().trim();
    const password = (fd.get('password')||'').toString();

    if(!email || !password){
      if(msg){ msg.textContent = 'メールとパスワードを入力してください。'; msg.classList.remove('error'); }
      return;
    }

    if(msg){ msg.textContent = '照合中...'; }
    await sleep(200);

    // find provider by loginId
    const providers = loadProviders();
    const found = providers.find(p => p.loginId.toLowerCase() === email.toLowerCase());
    if(!found || found.passwordHash !== password){
      if(msg){ msg.textContent = 'メールまたはパスワードが正しくありません。'; msg.classList.add('error'); }
      return;
    }

    try {
      // Save session with basic info
      const session = { id: found.id, name: found.name, loginId: found.loginId, signedInAt: Date.now() };
      sessionStorage.setItem('glowup:providerLoggedIn', '1');
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        // Skip server sync on GitHub Pages
      try{ if(!/github\.io$/i.test(location.hostname)) fetch('http://localhost:4015/api/sync-user', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ loginId: found.loginId, displayName: found.name, email: found.loginId, passwordHash: found.passwordHash }) }).catch(()=>{}); }catch(_){ }
      // If pending LINE link exists, attach it
  try{ const pending = sessionStorage.getItem('pendingLineLink'); if(pending && !/github\.io$/i.test(location.hostname)){ fetch('http://localhost:4015/api/link-line', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ loginId: found.loginId, lineUserId: pending }) }).then(()=> sessionStorage.removeItem('pendingLineLink')).catch(()=>{}); } }catch(e){}
      // redirect: returnTo が指定されていれば優先
      try{
        const u = new URL(location.href);
        const rt = u.searchParams.get('returnTo');
        if(rt){ location.href = rt; }
        else { location.href = BASE_PREFIX + '/pages/provider/index.html'; }
      }catch{ location.href = BASE_PREFIX + '/pages/provider/index.html'; }
    } catch (e) {
      if(msg) msg.textContent = '予期せぬエラーが発生しました。';
    }
  });
})();
