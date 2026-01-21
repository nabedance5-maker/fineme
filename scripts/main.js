export {};
// Detect GitHub Pages project base prefix
const PROJECT_BASE = (location.hostname && /github\.io$/i.test(location.hostname)) ? '/fineme' : '';
// Expose for other scripts when needed
try{ window.finemeBase = PROJECT_BASE; }catch{}

// Auto-redirect to project base when accessed without prefix on GitHub Pages
try{
  if(PROJECT_BASE && /github\.io$/i.test(location.hostname)){
    const path = location.pathname || '/';
    // If not already under /fineme, redirect preserving query/hash
    if(!path.startsWith(PROJECT_BASE)){
      const target = `${PROJECT_BASE}${path}${location.search||''}${location.hash||''}`;
      // Use replace to avoid polluting history
      location.replace(target);
    }
  }
}catch{}

// Compute a relative prefix to project root regardless of nesting depth
function resolvePrefix(){
  const segs = (location.pathname || '/').split('/').filter(Boolean);
  // segs includes file name as last item
  if(segs.length <= 1) return '.'; // at root like /index.html
  return '../'.repeat(segs.length - 1).replace(/\/$/, '');
}

function getSanitize(){ try{ const fn = window && window['sanitizeHtml']; return (typeof fn === 'function') ? fn : null; }catch{ return null; } }
async function inject(selector, relativePath){
  const host = document.querySelector(selector);
  if(!host) return;
  // If host already has content (e.g. server-rendered header), do not overwrite it.
  try{ if(host.childNodes && host.childNodes.length > 0) return; }catch{}
  const prefix = resolvePrefix();
  const url = `${prefix}/${relativePath}`;
  try {
    const res = await fetch(url);
    if(!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const html = await res.text();
    try{
      const sanitize = getSanitize();
      // If a sanitizer is available, use it before inserting HTML.
      if(sanitize){
        host.innerHTML = sanitize(html);
      } else {
        // Fallback: parse and append nodes; strip risky content only outside GitHub Pages.
        try{
          const dp = new DOMParser();
          const doc = dp.parseFromString(html, 'text/html');
          // Prefix root-relative asset links for GitHub Pages
          if(PROJECT_BASE){
            Array.from(doc.querySelectorAll('[src^="/"], [href^="/"]')).forEach(el=>{
              try{
                if(el.hasAttribute('src')){
                  const v = el.getAttribute('src'); if(v && v.startsWith('/')) el.setAttribute('src', PROJECT_BASE + v);
                }
                if(el.hasAttribute('href')){
                  const v = el.getAttribute('href'); if(v && v.startsWith('/')) el.setAttribute('href', PROJECT_BASE + v);
                }
              }catch(e){}
            });
          }
          if(!PROJECT_BASE){
            // remove script elements
            Array.from(doc.querySelectorAll('script')).forEach(s=> s.remove());
            // remove inline event handlers and javascript: href/src
            Array.from(doc.querySelectorAll('*')).forEach(el=>{
              // remove on* attributes
              Array.from(el.attributes || []).forEach(attr=>{
                try{
                  const name = attr.name || '';
                  const val = attr.value || '';
                  if(/^on/i.test(name)) el.removeAttribute(name);
                  if((name === 'href' || name === 'src') && /^javascript:/i.test(val)) el.removeAttribute(name);
                }catch(e){}
              });
            });
          }
          // import nodes into a fragment to avoid replacing host if injection fails
          const frag = document.createDocumentFragment();
          Array.from(doc.body.childNodes).forEach(n=> frag.appendChild(document.importNode(n, true)));
          host.appendChild(frag);
        }catch(e){ host.textContent = ''; }
      }
    }catch(e){ host.textContent = ''; }
  } catch (e) {
    // Fallback: try absolute path; on GitHub Pages, prefix with project base
    try {
      const abs = PROJECT_BASE ? `${PROJECT_BASE}/${relativePath}` : `/${relativePath}`;
      const res2 = await fetch(abs);
      if(!res2.ok) throw new Error(`Failed to fetch ${abs}: ${res2.status}`);
        try{
        const raw2 = await res2.text();
        const sanitize2 = getSanitize();
        if(sanitize2){
          host.innerHTML = sanitize2(raw2);
        } else {
          try{
            const dp = new DOMParser();
            const doc = dp.parseFromString(raw2, 'text/html');
            if(PROJECT_BASE){
              Array.from(doc.querySelectorAll('[src^="/"], [href^="/"]')).forEach(el=>{
                try{
                  if(el.hasAttribute('src')){
                    const v = el.getAttribute('src'); if(v && v.startsWith('/')) el.setAttribute('src', PROJECT_BASE + v);
                  }
                  if(el.hasAttribute('href')){
                    const v = el.getAttribute('href'); if(v && v.startsWith('/')) el.setAttribute('href', PROJECT_BASE + v);
                  }
                }catch(e){}
              });
            }
            if(!PROJECT_BASE){
              Array.from(doc.querySelectorAll('script')).forEach(s=> s.remove());
              Array.from(doc.querySelectorAll('*')).forEach(el=>{
                Array.from(el.attributes || []).forEach(attr=>{
                  try{ const name = attr.name||''; const val = attr.value||''; if(/^on/i.test(name)) el.removeAttribute(name); if((name==='href'||name==='src') && /^javascript:/i.test(val)) el.removeAttribute(name); }catch(e){}
                });
              });
            }
            const frag = document.createDocumentFragment(); Array.from(doc.body.childNodes).forEach(n=> frag.appendChild(document.importNode(n, true))); host.appendChild(frag);
          }catch(e2){ host.textContent = ''; }
        }
      }catch(e2){ host.textContent = ''; }
    } catch (e2) {
      console.warn('Header/Footer injection failed:', e2);
    }
  }
}

(function init(){
  // Apply project base prefix to absolute links when hosted under GitHub Pages
  try{
    if(PROJECT_BASE){
      document.addEventListener('DOMContentLoaded', ()=>{
        document.querySelectorAll('a[href^="/"]').forEach(a=>{
          const href = a.getAttribute('href'); if(!href) return; a.setAttribute('href', PROJECT_BASE + href);
        });
        document.querySelectorAll('form[action^="/"]').forEach(f=>{
          const act = f.getAttribute('action'); if(!act) return; f.setAttribute('action', PROJECT_BASE + act);
        });
        // Also prefix root-relative assets
        document.querySelectorAll('img[src^="/"]').forEach(img=>{
          const src = img.getAttribute('src'); if(!src) return; img.setAttribute('src', PROJECT_BASE + src);
        });
        document.querySelectorAll('script[src^="/"]').forEach(s=>{
          const src = s.getAttribute('src'); if(!src) return; s.setAttribute('src', PROJECT_BASE + src);
        });
        document.querySelectorAll('link[href^="/"]').forEach(l=>{
          const href = l.getAttribute('href'); if(!href) return; l.setAttribute('href', PROJECT_BASE + href);
        });
      });
    }
  }catch(e){}
  // --- SEO helpers ---
  function escapeHtml(str){
    return String(str)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }
  function setMeta(name, content){
    if(!content) return; const h=document.head;
    let el = h.querySelector(`meta[name="${name}"]`);
    if(!el){ el = document.createElement('meta'); el.setAttribute('name', name); h.appendChild(el); }
    el.setAttribute('content', String(content));
  }
  function setOG(property, content){
    if(!content) return; const h=document.head;
    let el = h.querySelector(`meta[property="${property}"]`);
    if(!el){ el = document.createElement('meta'); el.setAttribute('property', property); h.appendChild(el); }
    el.setAttribute('content', String(content));
  }
  function setLink(rel, href){
    if(!href) return; const h=document.head;
    let el = h.querySelector(`link[rel="${rel}"]`);
    if(!el){ el = document.createElement('link'); el.setAttribute('rel', rel); h.appendChild(el); }
    el.setAttribute('href', String(href));
  }
  function injectJsonLd(id, obj){
    const h=document.head;
    let el = id ? h.querySelector(`script#${id}`) : null;
    if(!el){
      el = document.createElement('script');
      if(id) el.id = id;
      el.setAttribute('type','application/ld+json');
      h.appendChild(el);
    }
    el.textContent = JSON.stringify(obj);
  }
  function canonicalUrlFromLocation(){
    const { origin, pathname } = location;
    let path = pathname;
    if(path.endsWith('/index.html')) path = path.slice(0, -'/index.html'.length) || '/';
    return origin + path;
  }
  function absoluteUrl(path){
    try{
      if(!path) return path;
      if(/^https?:\/\//i.test(path)) return path;
      if(path.startsWith('/') && PROJECT_BASE){ path = PROJECT_BASE + path; }
      return new URL(path, location.origin).href;
    }catch{ return path; }
  }
  function firstText(el, sel){ const n = el.querySelector(sel); return n ? (n.textContent||'').trim() : ''; }
  function firstImg(el){ const im = el.querySelector('img'); return im && im.getAttribute('src'); }
  function applySEOBase(){
    const siteName = 'Fineme';
    const url = location.origin + location.pathname + location.search;
    // title / description
    const h1 = document.querySelector('main h1');
    const title = document.title && document.title.trim() ? document.title : (h1 ? h1.textContent.trim() : siteName);
    if(!document.title || document.title.trim().length===0){ document.title = title; }
    let descTag = document.querySelector('meta[name="description"]');
    let desc = descTag ? descTag.getAttribute('content') : '';
    if(!desc){
      const main = document.querySelector('main') || document.body;
      const p = main ? main.querySelector('p') : null;
      desc = p ? (p.textContent||'').trim().slice(0, 160) : 'Finemeは美容・パーソナルサービスの検索と予約をサポートします。';
    }
    setMeta('description', desc);
    // On GitHub Pages, enforce noindex,nofollow across all pages
    if(PROJECT_BASE){ setMeta('robots', 'noindex,nofollow'); }
    // canonical
    setLink('canonical', canonicalUrlFromLocation());
    // OGP
    setOG('og:site_name', siteName);
    setOG('og:type', 'website');
    setOG('og:title', title);
    setOG('og:description', desc);
    setOG('og:url', url);
    // image
    let img = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    if(!img){
      const main = document.querySelector('main') || document.body;
      img = (main && (main.querySelector('img.service-thumb')?.getAttribute('src') || firstImg(main))) || '/assets/placeholders/placeholder-default.svg';
    }
    setOG('og:image', absoluteUrl(img));
    // Twitter
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', desc);
    setMeta('twitter:image', absoluteUrl(img));
    // JSON-LD: WebSite + Organization
    injectJsonLd('ld-website', {
      '@context':'https://schema.org', '@type':'WebSite',
      name: siteName, url: canonicalUrlFromLocation(),
      potentialAction: {
        '@type': 'SearchAction', target: absoluteUrl('/pages/search.html?keyword={search_term_string}'),
        'query-input': 'required name=search_term_string'
      }
    });
    injectJsonLd('ld-org', {
      '@context':'https://schema.org', '@type':'Organization',
      name: siteName, url: canonicalUrlFromLocation()
    });
  }
  async function enhanceDetailSEO(){
    // Wait until #detail is populated
    const sec = document.querySelector('#detail');
    if(!sec) return;
    const tryUpdate = async () => {
      const name = firstText(sec, 'h1');
      if(!name) return false;
      const desc = firstText(sec, 'p.muted') || firstText(sec, 'p');
      const img = sec.querySelector('img.service-thumb')?.getAttribute('src') || '/assets/placeholders/placeholder-default.svg';
      // Update OGP/Twitter quickly based on DOM
      setOG('og:title', name); setMeta('twitter:title', name);
      if(desc){ setMeta('description', desc); setOG('og:description', desc); setMeta('twitter:description', desc); }
      setOG('og:image', absoluteUrl(img)); setMeta('twitter:image', absoluteUrl(img));
      // JSON-LD: Service (with AggregateRating if available)
      const u = new URL(location.href);
      const serviceKey = u.searchParams.get('localId') ? `local:${u.searchParams.get('localId')}` : (u.searchParams.get('slug') ? `slug:${u.searchParams.get('slug')}` : '');
      let agg = null;
      if(serviceKey){
        try{
          const mod = await import('./reviews.js');
          const sum = mod.ratingSummary(serviceKey);
          if(sum && sum.count>0){ agg = { '@type':'AggregateRating', ratingValue: sum.avg, reviewCount: sum.count } }
        }catch{}
      }
      const ld = { '@context':'https://schema.org', '@type':'Service', name, description: desc || undefined, image: absoluteUrl(img), url: canonicalUrlFromLocation() };
      if(agg) ld.aggregateRating = agg;
      injectJsonLd('ld-service', ld);
      return true;
    };
    // Try now; if not ready, observe mutations briefly
    if(await tryUpdate()) return;
    const mo = new MutationObserver(async () => { if(await tryUpdate()){ mo.disconnect(); } });
    mo.observe(sec, { childList:true, subtree:true });
    setTimeout(()=> mo.disconnect(), 5000);
  }
  function routeForPath(path){
    if(!path) return null;
    if(path === '/' || path.endsWith('/index.html')) return '/';
    if(path.includes('/pages/search') || path.includes('/pages/detail')) return '/pages/search.html';
    if(path.includes('/pages/feature')) return '/pages/feature.html';
    if(path.includes('/pages/mypage')) return '/pages/mypage/index.html';
    if(path.includes('/pages/login')) return '/pages/login.html';
    return null;
  }

  function setActiveNav(){
    const current = routeForPath(location.pathname);
    const links = /** @type {NodeListOf<HTMLAnchorElement>} */(document.querySelectorAll('#site-header .nav-links a'));
    links.forEach(a => {
      a.classList.remove('is-active');
      a.removeAttribute('aria-current');
      try {
        const lp = a.pathname || a.getAttribute('href');
        if(current && lp === current){
          a.classList.add('is-active');
          a.setAttribute('aria-current','page');
        }
      } catch {}
    });
  }

  Promise.all([
    inject('#site-header','components/header.html?v=20251126'),
    inject('#site-footer','components/footer.html?v=20251126')
  ]).then(() => {
  const y = document.querySelector('[data-year]');
  if(y) y.textContent = String(new Date().getFullYear());
    setActiveNav();
    // Wire header search link to open modal instead of navigating to search page directly
    try{
      const headerSearchLink = document.querySelector('#site-header .nav-links a[href*="search"]');
      if(headerSearchLink){
        headerSearchLink.addEventListener('click', (e)=>{
          // On mobile, allow default behavior if long-pressed / open in new tab; normally prevent and open modal
          e.preventDefault();
          openHeaderSearchModal();
        });
      }
    }catch{}
    // Reflect current URL params into header search form and normalize names
    try{
      const form = document.querySelector('#site-header form.searchbar--compact');
      if(form){
        const u = new URL(location.href);
        const q = u.searchParams.get('q') || u.searchParams.get('keyword') || '';
        const region = u.searchParams.get('region') || '';
        const category = u.searchParams.get('category') || '';
        const sort = u.searchParams.get('sort') || '';
        const per = u.searchParams.get('per') || '12';
        const kw = form.querySelector('input[name="keyword"]'); if(kw && kw instanceof HTMLInputElement) kw.value = q;
        const rg = form.querySelector('select[name="region"]'); if(rg && rg instanceof HTMLSelectElement) rg.value = region;
        const ct = form.querySelector('input[name="category"]'); if(ct && ct instanceof HTMLInputElement) ct.value = category;
        const st = form.querySelector('input[name="sort"]'); if(st && st instanceof HTMLInputElement) st.value = sort;
        const ps = form.querySelector('input[name="per"]'); if(ps && ps instanceof HTMLInputElement) ps.value = per;
        const pg = form.querySelector('input[name="page"]'); if(pg && pg instanceof HTMLInputElement) pg.value = '1';
        // On submit, reset page to 1 and ensure q param is sent as keyword for compatibility
        form.addEventListener('submit', () => {
          const pg2 = form.querySelector('input[name="page"]'); if(pg2 && pg2 instanceof HTMLInputElement) pg2.value = '1';
          const kw2 = form.querySelector('input[name="keyword"]');
          if(kw2 && kw2 instanceof HTMLInputElement){ kw2.name = 'keyword'; }
        });
      }
    }catch{}
  // Apply base SEO (OGP/meta/JSON-LD)
  try{ applySEOBase(); }catch{}
    // Points badge: show only when user is logged in
    try{
      const container = document.getElementById('header-points');
      const badge = document.getElementById('header-points-badge');
      if(container){
        import('./user-auth.js').then(mod => {
          const sess = mod.getUserSession && mod.getUserSession();
          if(!sess){ container.hidden = true; return; }
          container.hidden = false;
          if(badge){
            let pts = 0, visits = 0, cnt = 0;
            try{
              const raw = localStorage.getItem('fineme:points:state');
              if(raw){ const obj = JSON.parse(raw)||{}; pts = Number(obj.points||0)||0; visits = Number(obj.visits||0)||0; cnt = Number(obj.reservations||0)||0; }
            }catch{}
            const ladder = (visits>0?visits:cnt);
            const rate = (ladder>=11)?3:(ladder>=4?2:1);
            badge.textContent = `${pts}pt / ${rate}%`;
            badge.title = `現在の還元率: ${rate}%`;
          }
        }).catch(()=>{ try{ container.hidden = true; }catch{} });
      }
    }catch{}
    // Mobile nav toggle
    const toggle = document.getElementById('nav-toggle');
    const menu = document.getElementById('nav-menu');
    if(toggle && menu){
      const closeMenu = () => { menu.classList.remove('is-open'); toggle.setAttribute('aria-expanded','false'); };
      const openMenu = () => { menu.classList.add('is-open'); toggle.setAttribute('aria-expanded','true'); };
      toggle.addEventListener('click', (e)=>{
        e.preventDefault();
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        expanded ? closeMenu() : openMenu();
      });
      // Close on outside click
      document.addEventListener('click', (e)=>{
        if(!menu.classList.contains('is-open')) return;
        const t = e.target;
        if(!(t instanceof Node)) return;
        const within = menu.contains(t) || toggle.contains(t);
        if(!within) closeMenu();
      });
      // Close on escape
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeMenu(); });
      // Close when a nav link is clicked
      menu.addEventListener('click', (e)=>{
        const t = e.target;
        if(t && t instanceof Element){
          const a = t.closest('a');
          if(a) closeMenu();
        }
      });
      // Close menu when resizing to desktop to avoid stale open state
      const onResize = () => {
        try{
          const w = window.innerWidth || document.documentElement.clientWidth;
          if(w >= 1025){
            // ensure desktop layout shows full nav and mobile menu is closed
            closeMenu();
          }
        }catch{}
      };
      window.addEventListener('resize', onResize);
    }
    // After header injected, update auth area for user session
    try{
      import('./user-auth.js').then(mod => {
        // expose a small global accessor so legacy code can check session via window.getUserSession()
        try{ if(mod && typeof mod.getUserSession === 'function') window.getUserSession = mod.getUserSession; }catch{}
        try{ if(mod && typeof mod.signOutUser === 'function') window.signOutUser = mod.signOutUser; }catch{}
        const s = mod.getUserSession ? mod.getUserSession() : null;
        const area = document.getElementById('header-auth-area');
        if(!area) return;
        if(s){
          // Do not show the user's name in the header. Only show actions.
          area.textContent = '';
          const signout = document.createElement('a');
          signout.id = 'header-signout';
          signout.href = '#';
          signout.textContent = 'ログアウト';
          const mp = document.createElement('a');
          mp.className = 'btn';
          mp.href = PROJECT_BASE ? (PROJECT_BASE + '/pages/mypage/index.html') : '/pages/mypage/index.html';
          mp.textContent = 'マイページ';
          area.appendChild(signout);
          area.appendChild(document.createTextNode(' '));
          area.appendChild(mp);
          const so = signout;
          if(so){ so.addEventListener('click', (e)=>{ e.preventDefault(); try{ if(typeof window['signOutUser'] === 'function'){ window['signOutUser'](); return; } }catch{} try{ sessionStorage.removeItem('glowup:userSession'); }catch{} location.href = PROJECT_BASE ? (PROJECT_BASE + '/') : '/'; }); }
        }else{
          area.textContent = '';
          const loginA = document.createElement('a');
          loginA.id = 'header-login-link';
          loginA.href = PROJECT_BASE ? (PROJECT_BASE + '/pages/user/login.html') : '/pages/user/login.html';
          loginA.textContent = 'ログイン';
          area.appendChild(loginA);
        }
      }).catch(()=>{});
      // Initialize notifications UI (if available)
      try{
        import('./notifications.js').then(mod => {
          // Auto-create upcoming reservation reminders for the logged-in user (24h before start)
          try{
            const s = (typeof window['getUserSession'] === 'function') ? window['getUserSession']() : null;
            if(s){
              const REQUESTS_KEY = 'glowup:requests';
              const SERVICES_KEY = 'glowup:services';
              const loadJson = (key)=>{ try{ const raw = localStorage.getItem(key); const arr = raw? JSON.parse(raw): []; return Array.isArray(arr)? arr: []; }catch{ return []; } };
              const saveJson = (key, val)=>{ try{ localStorage.setItem(key, JSON.stringify(val)); }catch{} };
              const services = loadJson(SERVICES_KEY);
              const serviceName = (id)=>{ const svc = services.find(x=> x.id===id); return svc? (svc.name||''): ''; };
              const toStartDateTime = (req)=>{ try{ return new Date(`${req.date}T${(req.start||'00:00')}:00`); }catch{ return null; } };
              const now = new Date().getTime();
              const dayMs = 24*60*60*1000;
              const reqs = loadJson(REQUESTS_KEY);
              let changed=false;
              for(const r of reqs){
                if(!r || r.status!=='approved') continue;
                if(r.userId && r.userId !== s.id) continue;
                const st = toStartDateTime(r); if(!st) continue;
                const diff = st.getTime() - now;
                if(diff > 0 && diff <= dayMs && !r.userNotified24h){
                  const title = '予約の24時間前通知';
                  const name = r.serviceName || serviceName(r.serviceId) || '予約';
                  const timeStr = r.end ? `${r.start}-${r.end}` : `${r.start}`;
                  const body = `${name} / ${r.date} ${timeStr} の予約が近づいています。`;
                  try{ if(typeof mod.addNotification === 'function'){ mod.addNotification({ toType:'user', toId: s.id, title, body, data:{ requestId: r.id } }); } }catch{}
                  r.userNotified24h = true; changed = true;
                }
              }
              if(changed) saveJson(REQUESTS_KEY, reqs);
            }
          }catch{}
          const updateBadge = ()=>{
            try{
              // Only show user notifications when a user session exists
              const s = (typeof window['getUserSession'] === 'function') ? window['getUserSession']() : null;
              const b = document.getElementById('header-notifs-badge');
              if(!b) return;
              if(!s){ b.hidden = true; return; }
              const filter = { toType: 'user', toId: s.id };
              const cnt = mod.getUnreadCount(filter);
              if(cnt>0){ b.hidden = false; b.textContent = String(cnt); } else { b.hidden = true; }
            }catch{}
          };
          updateBadge();
          const btn = document.getElementById('header-notifs-btn');
          const dd = document.getElementById('header-notifs-dropdown');
          const list = document.getElementById('header-notifs-list');
          const clearBtn = document.getElementById('header-notifs-clear');
          if(btn){
            // Replace dropdown behavior with a robust popup anchored to the button.
            btn.addEventListener('click', (e)=>{
              e.preventDefault();
              // Hide legacy dropdown if present to avoid overlap
              try{ if(dd) dd.style.display = 'none'; }catch{}
              // Remove any existing popup
              const existing = document.getElementById('header-notifs-popup');
              if(existing){ existing.remove(); return; }

              const s = (typeof window['getUserSession'] === 'function') ? window['getUserSession']() : null;
              const arr = (mod && typeof mod.loadNotifications === 'function') ? mod.loadNotifications() : [];
              const userNotifications = s ? arr.filter(it=> it.toType === 'user' && (!it.toId || it.toId === s.id)) : [];

              // create popup
              const popup = document.createElement('div');
              popup.id = 'header-notifs-popup';
              popup.setAttribute('role','dialog');
              popup.setAttribute('aria-label','通知');
              popup.style.position = 'absolute';
              popup.style.minWidth = '260px';
              popup.style.maxWidth = '420px';
              popup.style.background = '#ffffff';
              popup.style.border = '1px solid rgba(0,0,0,0.08)';
              popup.style.boxShadow = '0 6px 18px rgba(15,23,42,0.12)';
              popup.style.padding = '8px';
              popup.style.borderRadius = '8px';
              popup.style.zIndex = '9999';

              // Header
              const h = document.createElement('div');
              h.style.display = 'flex'; h.style.justifyContent = 'space-between'; h.style.alignItems = 'center';
              h.style.marginBottom = '8px';
              const hTitle = document.createElement('div'); hTitle.style.fontWeight = '700'; hTitle.textContent = '通知';
              const hClose = document.createElement('button'); hClose.id = 'header-notifs-popup-close'; hClose.style.background = 'transparent'; hClose.style.border = 'none'; hClose.style.cursor = 'pointer'; hClose.style.fontSize = '16px'; hClose.textContent = '✕';
              h.appendChild(hTitle); h.appendChild(hClose);
              popup.appendChild(h);

              const content = document.createElement('div');
              content.style.maxHeight = '48vh'; content.style.overflow = 'auto';
              if(!s || userNotifications.length === 0){
                const m = document.createElement('div');
                m.className = 'muted';
                m.style.padding = '12px';
                m.textContent = '現在、新着通知はありません';
                content.appendChild(m);
              } else {
                userNotifications.slice(0,50).forEach(it=>{
                  const el = document.createElement('div');
                  el.style.padding='8px'; el.style.borderBottom='1px solid #f3f4f6'; el.style.cursor='pointer';
                  const t = document.createElement('div'); t.style.fontWeight='700'; t.textContent = it.title || '';
                  const b = document.createElement('div'); b.style.fontSize='13px'; b.style.color='#6b7280'; b.textContent = it.body || '';
                  const d = document.createElement('div'); d.style.fontSize='12px'; d.style.color='#9ca3af'; d.style.marginTop='6px'; d.textContent = it.createdAt ? new Date(it.createdAt).toLocaleString() : '';
                  if(!it.read){ el.style.background='#f8fafc'; }
                  el.appendChild(t); el.appendChild(b); el.appendChild(d);
                  el.addEventListener('click', ()=>{ try{ mod.showNotificationModal(it, { toType: 'user' }); if(typeof mod.saveNotifications === 'function') { const arrAll = mod.loadNotifications(); const idx = arrAll.findIndex(x=> x.id === it.id); if(idx>=0){ arrAll[idx].read = true; mod.saveNotifications(arrAll); } } updateBadge(); popup.remove(); }catch{} });
                  content.appendChild(el);
                });
              }
              popup.appendChild(content);

              // position popup near button
              const rect = btn.getBoundingClientRect();
              const scrollX = window.scrollX || window.pageXOffset;
              const scrollY = window.scrollY || window.pageYOffset;
              // default left: align right edges
              const approxWidth = 320;
              let left = rect.right + scrollX - approxWidth;
              if(left < 8) left = rect.left + scrollX;
              if(left + approxWidth > document.documentElement.clientWidth) left = Math.max(8, document.documentElement.clientWidth - approxWidth - 8);
              const top = rect.bottom + scrollY + 8;
              popup.style.left = left + 'px';
              popup.style.top = top + 'px';

              document.body.appendChild(popup);

              // close handlers
              const closePopup = ()=>{ const p = document.getElementById('header-notifs-popup'); if(p) p.remove(); document.removeEventListener('click', outside); document.removeEventListener('keydown', onKey); };
              document.getElementById('header-notifs-popup-close').addEventListener('click', closePopup);
              const outside = (ev)=>{ const t = ev.target; if(!(t instanceof Node)) return; const p = document.getElementById('header-notifs-popup'); if(!p) return; if(!p.contains(t) && t !== btn && !btn.contains(t)) closePopup(); };
              const onKey = (ev)=>{ if(ev.key === 'Escape') closePopup(); };
              // allow closing by clicking outside
              setTimeout(()=>{ document.addEventListener('click', outside); document.addEventListener('keydown', onKey); }, 0);
            });
          }
          if(clearBtn){ clearBtn.addEventListener('click', ()=>{ const s = (typeof window['getUserSession'] === 'function') ? window['getUserSession']() : null; if(!s) return; const arr = mod.loadNotifications(); arr.forEach(x=> { if(x.toType==='user' && (!x.toId || x.toId===s.id)) x.read = true; }); mod.saveNotifications(arr); updateBadge(); if(list){ list.textContent=''; const m = document.createElement('div'); m.className='muted'; m.textContent='通知はありません'; list.appendChild(m); } }); }
        }).catch(()=>{});
      }catch{}
    }catch{}
    // Show storage capacity warning when near limit (non-blocking)
    try{
      import('./storage-health.js').then(mod => {
        if(mod && typeof mod.showStorageWarningIfNeeded==='function'){
          mod.showStorageWarningIfNeeded();
        }
      }).catch(()=>{});
    }catch{}
  });
  // --- Category card quick-search modal ---
  // Create modal container
  const CATEGORY_TEXTS = {
    hair: {
      title: 'ヘア',
      body: `いつもの美容室、なんとなく同じ髪型を続けてない？\n髪型は印象を左右する大きな要素。似合うスタイルを提案してくれる美容師や、日常のセット方法を教えてくれる人に出会うだけで、印象も扱いやすさもぐっと変わる。“整える”から“似合う”へアップデートしよう。`
    },
    eyebrow: {
      title: '眉毛',
      body: `眉が変わると、顔が締まる。ぼんやりした印象や疲れ顔は、眉のラインで簡単に変えられる。自分の骨格や雰囲気に合わせたデザインで、自然なのに印象的な目元に。髪よりも先に、人の印象を変えるパーツです。`
    },
    esthetic: {
      title: '肌・エステ',
      body: `肌が整うと、見た目の清潔感も信頼感も変わる。ニキビやテカリ、カサつきなど、気になる肌トラブルはプロのケアで改善できる。肌がキレイになると、自信を持って人と話せるようになる。“清潔感”の第一歩は、肌から。`
    },
    fashion: {
      title: '服・コーデ',
      body: `服は“センス”より“似合う”が大事。プロに見てもらうと、自分では気づけない似合わせのコツが分かる。「何を着たらいいか分からない」を卒業して、服選びを楽しもう。外見の印象が、自然とアップデートされていく。`
    },
    gym: {
      title: '体（パーソナルトレーニング）',
      body: `姿勢や体つきは、印象を左右する大きな要素。ジムに通う目的は“筋肉をつけること”だけじゃない。魅せる体をつくることで、姿勢や自信が自然と整う。トレーニングは、見た目を変える最強の自己投資です。`
    },
    orthodontics: {
      title: '歯科矯正',
      body: `歯並びは、笑顔の印象を決める大事なポイント。少し整えるだけで、清潔感・信頼感・若々しさが格段に上がる。矯正は長期の投資だけど、その分“自分に自信が持てる笑顔”を手に入れられる。見た目の印象を、根本から変える選択を。`
    },
    makeup: {
      title: 'メイク',
      body: `メイクは「隠す」ためじゃなく「魅せる」ため。肌のトーンを整えるだけで、清潔感も好印象もアップ。バレない自然なメンズメイクなら、初めてでも安心。自分の顔を“ちょっとカッコよく見せる”体験をしてみよう。`
    },
    nail: {
      title: 'ネイル',
      body: `ネイル＝派手、と思ってない？メンズネイルは色を塗るものではなく、“手元を整えるケア”。爪の形を整え、表面を磨くだけで、自然に清潔感が出る。仕事やデートで見られる手元こそ、印象アップの隠れポイント。`
    },
    photo: {
      title: '写真撮影',
      body: `写真は“今の自分の印象”をそのまま映す鏡。プロの撮影では、表情の作り方や角度の見せ方までサポートしてくれる。マッチングアプリやSNS、ビジネスプロフィールなどにも使える好印象の一枚を。“写真写りが悪い”を今日で卒業しよう。`
    },
    diagnosis: {
      title: '診断（カラー／骨格）',
      body: `「なんか垢抜けない…」と思うなら、“似合う”を知らないだけ。パーソナルカラーや骨格を知ると、服も髪型も選びやすくなる。プロの診断で、自分の魅力を引き出す方向性が見える。垢抜けは、感覚ではなく理論でつくる時代。`
    },
    consulting: {
      title: '外見トータルサポート',
      body: `どこから変えればいいか分からないなら、まずは相談を。髪・眉・肌・服・姿勢をトータルで見てもらうと、全体のバランスが整う。自分に合うスタイルを一緒に設計していくから、再現もしやすい。“自分史上最高”をプロと一緒に形にしよう。`
    },
    marriage: {
      title: '結婚相談所',
      body: `出会いがうまくいかないのは、性格よりも“印象”の問題かもしれない。専門のカウンセラーと一緒に、外見も内面もアップデートしていくことで、出会いの質が変わる。自分をよく見せる努力が、ちゃんと報われる場所。本気で恋をしたい人に。`
    },
    hairremoval: {
      title: '脱毛',
      body: `青ヒゲやムダ毛の印象で損していない？ムダ毛を整えるだけで、肌が明るく見えて清潔感もアップ。面倒な自己処理からも解放されるから、毎日の印象管理がラクになる。“爽やかさ”をつくる新しい習慣を始めよう。`
    },
    whitening: {
      title: 'ホワイトニング',
      body: `歯が白くなると、顔全体がパッと明るく見える。第一印象で“爽やか”や“信頼できそう”と思われる人は、たいてい歯がキレイ。手軽なケアで、笑顔に自信を持てるようになる。“印象が変わる”のは、実はたった数トーンの違いから。`
    },
    cosmetic: {
      title: '美容外科・美容クリニック',
      body: `手術・注入など医療行為による見た目の改善を検討できます。一方で、眉/メイク/エステ/ジム/診断/撮影など“非外科の選択肢”で十分に満足できる場合もあります。適応や副作用・ダウンタイムの説明を理解し、必要に応じてセカンドオピニオンを。最終判断はご自身の意思で、無理なく。`
    },
    aga: {
      title: 'AGA',
      body: `薄毛の悩みは“見た目の自信”に直結します。専門クリニックでの診療や、継続的なケアで、今の自分に合った改善方法が見つかる。早く始めるほど効果が期待できるから、“悩みを放置しない”が正解。自分に合う方法を相談してみよう。`
    }
  };
  function ensureSearchModal(){
    if(document.getElementById('category-search-modal')) return document.getElementById('category-search-modal');
    const modal = document.createElement('div'); modal.id = 'category-search-modal';
    const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
    const sheet = document.createElement('div'); sheet.className = 'modal-sheet';
    const closeBtn = document.createElement('button'); closeBtn.id = 'category-search-modal-close'; closeBtn.className = 'modal-close'; closeBtn.textContent = '✕';
    const body = document.createElement('div'); body.id = 'category-search-modal-body'; body.className = 'modal-body';
    sheet.appendChild(closeBtn);
    sheet.appendChild(body);
    backdrop.appendChild(sheet);
    modal.appendChild(backdrop);
    document.body.appendChild(modal);
    // handlers
    backdrop.addEventListener('click', (e)=>{ if(e.target && (e.target instanceof Element) && e.target.classList.contains('modal-backdrop')) modal.remove(); });
    closeBtn.addEventListener('click', ()=> modal.remove());
    return modal;
  }

  // --- Header search modal (reuses hero search fields) ---
  function ensureHeaderSearchModal(){
    if(document.getElementById('header-search-modal')) return document.getElementById('header-search-modal');
    const modal = document.createElement('div'); modal.id = 'header-search-modal';
    const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
    const sheet = document.createElement('div'); sheet.className = 'modal-sheet';
    const closeBtn = document.createElement('button'); closeBtn.id = 'header-search-modal-close'; closeBtn.className = 'modal-close'; closeBtn.textContent = '✕';
    const body = document.createElement('div'); body.id = 'header-search-modal-body'; body.className = 'modal-body';
    sheet.appendChild(closeBtn);
    sheet.appendChild(body);
    backdrop.appendChild(sheet);
    modal.appendChild(backdrop);
    document.body.appendChild(modal);
    backdrop.addEventListener('click', (e)=>{ if(e.target && (e.target instanceof Element) && e.target.classList.contains('modal-backdrop')) modal.remove(); });
    closeBtn.addEventListener('click', ()=> modal.remove());
    return modal;
  }

  function openHeaderSearchModal(){
    const modal = ensureHeaderSearchModal();
    const body = modal.querySelector('#header-search-modal-body');
    if(!body) return;
    // Render a simplified, safe search form using DOM APIs
    const title = document.createElement('h3'); title.className = 'modal-title'; title.textContent = '検索';
    const form = document.createElement('form'); form.className = 'modal-search-form'; form.action = PROJECT_BASE ? (PROJECT_BASE + '/pages/search.html') : '/pages/search.html'; form.method = 'get';

    const rowKw = document.createElement('div'); rowKw.className = 'modal-search-row modal-search-row-keyword';
    const inputKw = document.createElement('input'); inputKw.name = 'keyword'; inputKw.type = 'text'; inputKw.className = 'modal-search-input'; inputKw.placeholder = '何を探しますか？（例: メンズメイク、撮影）'; inputKw.setAttribute('aria-label','キーワード');
    const submitBtn = document.createElement('button'); submitBtn.type = 'submit'; submitBtn.className = 'btn'; submitBtn.textContent = '検索';
    rowKw.appendChild(inputKw); rowKw.appendChild(submitBtn);

    const rowSelects = document.createElement('div'); rowSelects.className = 'modal-search-row modal-search-row-selects';
    // region select
    const regionSelect = document.createElement('select'); regionSelect.name = 'region'; regionSelect.className = 'modal-search-select'; regionSelect.setAttribute('aria-label','都道府県');
    const regions = ['','hokkaido','aomori','iwate','miyagi','akita','yamagata','fukushima','ibaraki','tochigi','gunma','saitama','chiba','tokyo','kanagawa','niigata','toyama','ishikawa','fukui','yamanashi','nagano','gifu','shizuoka','aichi','mie','shiga','kyoto','osaka','hyogo','nara','wakayama','tottori','shimane','okayama','hiroshima','yamaguchi','tokushima','kagawa','ehime','kochi','fukuoka','saga','nagasaki','kumamoto','oita','miyazaki','kagoshima','okinawa'];
    const regionLabels = ['全国','北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
    regions.forEach((val,i)=>{ const opt = document.createElement('option'); opt.value = val; opt.textContent = regionLabels[i] || val; regionSelect.appendChild(opt); });

    // purpose select
    const purposeSelect = document.createElement('select'); purposeSelect.name = 'purpose'; purposeSelect.className = 'modal-search-select'; purposeSelect.setAttribute('aria-label','目的');
    const purposes = [['','目的で絞り込む（任意）'],['first_impression','第一印象を変えたい'],['profile_photo','プロフィール写真を良くしたい'],['confidence','恋愛で自信を持ちたい'],['body_shape','体を整えたい'],['know_what_suits','自分に似合うものを知りたい'],['total_update','トータルで磨く']];
    purposes.forEach(p=>{ const opt=document.createElement('option'); opt.value=p[0]; opt.textContent=p[1]; purposeSelect.appendChild(opt); });

    // category select (short list)
    const categorySelect = document.createElement('select'); categorySelect.name = 'category'; categorySelect.className = 'modal-search-select'; categorySelect.setAttribute('aria-label','カテゴリ');
    const cats = [['','すべてのカテゴリ'],['consulting','外見トータルサポート'],['gym','パーソナルジム'],['makeup','メイクアップ'],['hair','ヘア'],['diagnosis','カラー/骨格診断'],['fashion','コーデ提案'],['photo','写真撮影（アプリ等）'],['marriage','結婚相談所'],['eyebrow','眉毛'],['hairremoval','脱毛'],['esthetic','エステ'],['cosmetic','美容外科・美容クリニック'],['whitening','ホワイトニング'],['orthodontics','歯科矯正'],['nail','ネイル'],['aga','AGA']];
    cats.forEach(c=>{ const opt=document.createElement('option'); opt.value=c[0]; opt.textContent=c[1]; categorySelect.appendChild(opt); });

    rowSelects.appendChild(regionSelect); rowSelects.appendChild(purposeSelect); rowSelects.appendChild(categorySelect);

    form.appendChild(rowKw); form.appendChild(rowSelects);
    body.textContent = ''; // clear
    body.appendChild(title); body.appendChild(form);
    // Try to prefill from hero if available
    try{
      const heroKw = document.querySelector('.hero .searchbar input[name="keyword"]');
      const heroCat = document.querySelector('.hero .searchbar select[name="category"]');
      const kwEl = body.querySelector('input[name="keyword"]');
      if(kwEl && heroKw && kwEl instanceof HTMLInputElement && heroKw instanceof HTMLInputElement){
        kwEl.value = heroKw.value || '';
      }
      const catEl = body.querySelector('select[name="category"]');
      if(catEl && heroCat && catEl instanceof HTMLSelectElement && heroCat instanceof HTMLSelectElement){
        catEl.value = heroCat.value || '';
      }
      const u = new URL(location.href);
      const q = u.searchParams.get('keyword') || u.searchParams.get('q') || '';
      const categoryParam = u.searchParams.get('category') || '';
      if(kwEl && kwEl instanceof HTMLInputElement && !kwEl.value) kwEl.value = q;
      if(catEl && catEl instanceof HTMLSelectElement && categoryParam) catEl.value = categoryParam;
    }catch{}
    // focus
    const focusEl = body.querySelector('.modal-search-input'); if(focusEl && focusEl instanceof HTMLElement) focusEl.focus();
  }

  // Open modal and inject a clone of the main search form with a preset category
  function openCategorySearchModal(categoryKey){
    const modal = ensureSearchModal();
    const body = modal.querySelector('#category-search-modal-body');
    if(!body) return;
    // Render category description (title + body) and a search button
    const key = (categoryKey||'').toString();
    const data = CATEGORY_TEXTS[key] || { title: key, body: 'このカテゴリの説明は準備中です。' };
    // Build content safely using DOM APIs
    body.textContent = '';
    const h3 = document.createElement('h3'); h3.className = 'modal-title'; h3.textContent = data.title || '';
    body.appendChild(h3);
    const txt = document.createElement('div'); txt.className = 'modal-text';
    // convert newlines to <br>
    (String(data.body || '')).split('\n').forEach((line, idx) => { txt.appendChild(document.createTextNode(line)); if(idx < (String(data.body||'').split('\n').length - 1)) txt.appendChild(document.createElement('br')); });
    body.appendChild(txt);

    const form = document.createElement('form'); form.className = 'modal-search-form'; form.action = PROJECT_BASE ? (PROJECT_BASE + '/pages/search.html') : '/pages/search.html'; form.method = 'get';
    const hid = document.createElement('input'); hid.type = 'hidden'; hid.name = 'category'; hid.value = key; form.appendChild(hid);
    const selectsRow = document.createElement('div'); selectsRow.className = 'modal-search-row modal-search-row-selects';
    const regionSelect = document.createElement('select'); regionSelect.name = 'region'; regionSelect.className = 'modal-search-select'; regionSelect.setAttribute('aria-label','都道府県');
    const regions = ['','hokkaido','aomori','iwate','miyagi','akita','yamagata','fukushima','ibaraki','tochigi','gunma','saitama','chiba','tokyo','kanagawa','niigata','toyama','ishikawa','fukui','yamanashi','nagano','gifu','shizuoka','aichi','mie','shiga','kyoto','osaka','hyogo','nara','wakayama','tottori','shimane','okayama','hiroshima','yamaguchi','tokushima','kagawa','ehime','kochi','fukuoka','saga','nagasaki','kumamoto','oita','miyazaki','kagoshima','okinawa'];
    const regionLabels = ['全国','北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'];
    regions.forEach((val,i)=>{ const opt=document.createElement('option'); opt.value=val; opt.textContent=regionLabels[i]||val; regionSelect.appendChild(opt); });
    const purposeSelect = document.createElement('select'); purposeSelect.name='purpose'; purposeSelect.className='modal-search-select'; purposeSelect.setAttribute('aria-label','目的');
    const purposes = [['','目的で絞り込む（任意）'],['first_impression','第一印象を変えたい'],['profile_photo','プロフィール写真を良くしたい'],['confidence','恋愛で自信を持ちたい'],['body_shape','体を整えたい'],['know_what_suits','自分に似合うものを知りたい'],['total_update','トータルで磨く']];
    purposes.forEach(p=>{ const opt=document.createElement('option'); opt.value=p[0]; opt.textContent=p[1]; purposeSelect.appendChild(opt); });
    selectsRow.appendChild(regionSelect); selectsRow.appendChild(purposeSelect);
    form.appendChild(selectsRow);

    const rowKw = document.createElement('div'); rowKw.className='modal-search-row modal-search-row-keyword';
    const kwInput = document.createElement('input'); kwInput.name='keyword'; kwInput.type='text'; kwInput.className='modal-search-input'; kwInput.placeholder='フリーワード（例: カット、撮影）'; kwInput.setAttribute('aria-label','キーワード');
    const searchBtn = document.createElement('button'); searchBtn.type='submit'; searchBtn.className='btn'; searchBtn.textContent='検索する';
    rowKw.appendChild(kwInput); rowKw.appendChild(searchBtn);
    form.appendChild(rowKw);

    body.appendChild(form);
    const actions = document.createElement('div'); actions.className = 'modal-actions';
    const catLink = document.createElement('a'); catLink.className = 'btn btn-ghost'; try{ catLink.href = `./pages/search.html?category=${encodeURIComponent(key)}`; }catch(e){ catLink.href = './pages/search.html'; }
    catLink.textContent = 'カテゴリ一覧を見る';
    actions.appendChild(catLink);
    body.appendChild(actions);
    // Focus keyword input if available (guarded)
    const kw = body.querySelector('.modal-search-input'); if(kw && kw instanceof HTMLElement) kw.focus();
  }

  // Wire category card clicks (delegation)
  document.addEventListener('click', (e)=>{
    const target = e.target;
    if(!(target instanceof Element)) return;
    const card = target.closest('.category-card a');
    if(!card) return;
    // intercept and open modal instead of navigating
    const href = card.getAttribute('href') || '';
    const u = new URL(href, location.origin);
    const cat = u.searchParams.get('category') || u.pathname.split('category=')[1] || '';
    if(cat){
      e.preventDefault();
      openCategorySearchModal(cat);
    }
  });
  // After provider navbar injected, wire up mobile toggle as well
  document.addEventListener('DOMContentLoaded', () => {
    // Enhance SEO for detail page once DOM is ready
    try{ if(location.pathname.includes('/pages/detail')) enhanceDetailSEO(); }catch{}
    const pToggle = document.getElementById('prov-nav-toggle');
    const pMenu = document.getElementById('prov-nav-menu');
    if(pToggle && pMenu){
      const close = ()=>{ pMenu.classList.remove('is-open'); pToggle.setAttribute('aria-expanded','false'); };
      const open = ()=>{ pMenu.classList.add('is-open'); pToggle.setAttribute('aria-expanded','true'); };
      pToggle.addEventListener('click', (e)=>{
        e.preventDefault();
        (pToggle.getAttribute('aria-expanded') === 'true') ? close() : open();
      });
      document.addEventListener('click', (e)=>{
        if(!pMenu.classList.contains('is-open')) return;
        const t = e.target;
        if(!(t instanceof Node)) return;
        if(!(pMenu.contains(t) || pToggle.contains(t))) close();
      });
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
      pMenu.addEventListener('click', (e)=>{
        const t = e.target;
        if(t && t instanceof Element && t.closest('a')) close();
      });
    }

    // Show/Hide password toggles for all password inputs on the page
    try{
      const initPwToggles = () => {
        /** @type {NodeListOf<HTMLInputElement>} */
        const pwInputs = document.querySelectorAll('input[type="password"]');
        pwInputs.forEach((input) => {
          // Skip if already enhanced
          if(input.dataset.pwToggleAttached === '1') return;
          input.dataset.pwToggleAttached = '1';
          const label = input.closest('label');
          if(label){ label.classList.add('has-pw-toggle'); }
          // Create a button
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'pw-toggle-btn';
          btn.setAttribute('aria-label','パスワードを表示');
          btn.setAttribute('aria-pressed','false');
          btn.textContent = '表示';
          const targetContainer = label || input.parentElement;
          if(!targetContainer) return;
          targetContainer.appendChild(btn);
          btn.addEventListener('click', () => {
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            btn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
            btn.textContent = isHidden ? '非表示' : '表示';
          });
        });
      };
      initPwToggles();
    }catch{}
  });
})();
