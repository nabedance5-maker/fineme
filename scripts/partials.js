// @ts-nocheck
// Load per-section partials: mypage sidenav, provider navbar/footer, admin sidebar
function resolvePrefix(){
  const segs = (location.pathname || '/').split('/').filter(Boolean);
  if(segs.length <= 1) return './';
  // For a path like /pages/admin/providers.html (3 segments) we need to go up 2 levels: '../'.repeat(2) => '../../'
  return '../'.repeat(segs.length - 1);
}
async function injectInto(selector, relPath){
  const host = document.querySelector(selector);
  if(!host) return Promise.resolve(false);
  console.debug('[partials] injectInto', { selector, relPath });
  // try multiple candidate URLs to be tolerant of different hosting/relative path layouts
  const prefix = resolvePrefix();
  const candidates = [
    `${prefix}${relPath}`,
    `/${relPath}`,
    relPath
  ].filter(Boolean);
  for(const url of candidates){
    try{
      console.debug('[partials] trying', url);
      const res = await fetch(url, { cache: 'no-store' });
      console.debug('[partials] fetch', url, 'status', res.status);
      if(!res.ok) throw new Error(String(res.status));
  const text = await res.text();
  // sanitize injected partials if sanitizer is available; otherwise allow trusted components HTML
  try{
    if(typeof sanitizeHtml === 'function'){
      host.innerHTML = sanitizeHtml(text);
    } else {
      // Trust first-party components under /components/ and render as HTML
      const isTrusted = (relPath && relPath.indexOf('components/') === 0) || (url && url.indexOf('/components/') !== -1);
      if(isTrusted){ host.innerHTML = text; } else { host.textContent = text; }
    }
  }catch(e){ host.innerHTML = text; }
      console.info('[partials] injected', url, 'into', selector);
      return true;
    }catch(e){ console.debug('[partials] fetch failed', url, e && e.message); /* try next */ }
  }
  console.warn('Partial injection failed for all candidates:', relPath, candidates);
  // Fallback: provide a minimal inline admin sidebar so the admin pages remain navigable
  try{
    // build minimal admin sidebar DOM safely
    const aside = document.createElement('aside'); aside.className = 'card'; aside.style.padding = '12px';
    const nav = document.createElement('nav'); const ul = document.createElement('ul'); ul.style.listStyle='none'; ul.style.padding='0'; ul.style.margin='0';
    const links = [
      ['/pages/admin/index.html','ダッシュボード'],
      ['/pages/admin/providers.html','掲載者管理'],
      ['/pages/admin/features.html','特集作成・編集'],
      ['/pages/admin/analytics.html','アクセス分析']
    ];
    links.forEach(([href,text])=>{ const li = document.createElement('li'); const a = document.createElement('a'); a.href = href; a.textContent = text; li.appendChild(a); ul.appendChild(li); });
    nav.appendChild(ul); aside.appendChild(nav); host.appendChild(aside);
  }catch(e){}
  return false;
}

(function init(){
  injectInto('#mypage-sidenav', 'components/mypage-sidenav.html');
  const provNav = injectInto('#provider-navbar', 'components/provider-navbar.html');
  // グローバルに準備完了のPromiseを公開
  try{ window.finemePartials = window.finemePartials || {}; window.finemePartials.provNavReady = provNav; }catch{}
  injectInto('#provider-footer', 'components/provider-footer.html');
  injectInto('#admin-sidebar', 'components/admin-sidebar.html');
  // Provider navbar が注入されたら、ボディクラス付与とモバイルメニューの開閉を配線
  provNav.then((injected) => {
    if(!injected) return;
    // 注入完了イベントを通知
    try{ document.dispatchEvent(new CustomEvent('fineme:provNavReady')); }catch{}
    document.body.classList.add('has-provider-sidebar');
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
        if(!(pMenu.contains(e.target) || pToggle.contains(e.target))) close();
      });
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
      pMenu.addEventListener('click', (e)=>{ if(e.target.closest('a')) close(); });
    }
    // Provider notifications: display unread count and quick list in provider session area
    try{
      import('./notifications.js').then(mod => {
        import('./auth.js').then(authMod => {
          try{
            const sess = authMod.getProviderSession && authMod.getProviderSession();
            const area = document.getElementById('provider-session-area');
            if(!area) return;
            const wrapper = document.createElement('div'); wrapper.style.display='flex'; wrapper.style.gap='8px'; wrapper.style.alignItems='center';
            const badgeBtn = document.createElement('button'); badgeBtn.className='btn btn-ghost'; badgeBtn.type='button'; badgeBtn.id='provider-notifs-btn'; badgeBtn.textContent='🔔';
            const badge = document.createElement('span'); badge.id='provider-notifs-badge'; badge.style.minWidth='22px'; badge.style.padding='2px 8px'; badge.style.borderRadius='999px'; badge.style.background='#ef4444'; badge.style.color='#fff'; badge.style.fontSize='12px'; badge.style.marginLeft='6px'; badge.hidden=true;
            badgeBtn.appendChild(badge);
            wrapper.appendChild(badgeBtn);
            area.appendChild(wrapper);
            const update = ()=>{
              // Only show provider notifications when a provider is logged in
              if(!sess){ badge.hidden = true; const inline = document.getElementById('prov-notifs-inline-badge'); if(inline) inline.hidden = true; return; }
              const filter = { toType: 'provider', toId: sess.id };
              const cnt = mod.getUnreadCount(filter);
              if(cnt>0){ badge.hidden=false; badge.textContent = String(cnt); } else { badge.hidden=true; }
              // update inline badge near requests link if present
              const inline = document.getElementById('prov-notifs-inline-badge');
              if(inline){ if(cnt>0){ inline.hidden=false; inline.textContent = String(cnt); } else { inline.hidden=true; } }
            };
            update();
            badgeBtn.addEventListener('click', ()=>{
              try{
                if(!sess){ // show a centered modal prompting login
                  mod.showNotificationsListModal([], { toType: 'provider' });
                  update();
                  return;
                }
                const arr = mod.loadNotifications().filter(it=> it.toType === 'provider' && (!it.toId || it.toId === sess.id));
                // show centered modal with list; the modal will mark displayed items read
                mod.showNotificationsListModal(arr.slice(0,50), { toType: 'provider' });
                // refresh badge state after modal opened
                setTimeout(update, 50);
              }catch(e){ console.warn('open provider notifications failed', e); }
            });
            // clicking the inline badge should open the same modal
              const inlineBadge = document.getElementById('prov-notifs-inline-badge');
              if(inlineBadge){ inlineBadge.style.cursor='pointer'; inlineBadge.addEventListener('click', ()=> badgeBtn.click()); }
            
          }catch(e){ console.warn('provider notifs init failed', e); }
        }).catch(()=>{});
      }).catch(()=>{});
    }catch{}
  }).catch(()=>{});
  // admin footerは通常のサイトフッターをそのまま使用
})();
