const NOTIFS_KEY = 'glowup:notifications';

export function loadNotifications(){
  try{ const raw = localStorage.getItem(NOTIFS_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr)?arr:[]; }catch{ return []; }
}
export function saveNotifications(list){ try{ localStorage.setItem(NOTIFS_KEY, JSON.stringify(list)); }catch{} }

export function addNotification(n){
  const list = loadNotifications();
  const now = new Date().toISOString();
  const item = Object.assign({ id: 'n_'+Math.random().toString(36).slice(2,10), read: false, createdAt: now }, n || {});
  list.unshift(item);
  saveNotifications(list);
  return item;
}

export function markRead(id){
  const list = loadNotifications();
  let changed = false;
  for(const it of list){ if(it.id === id && !it.read){ it.read = true; changed = true; } }
  if(changed) saveNotifications(list);
  return changed;
}

export function getUnreadCount(filter){
  const list = loadNotifications();
  return list.filter(it=> !it.read && (!filter || (it.toType===filter.toType && (!filter.toId || it.toId===filter.toId)))).length;
}

export function clearAll(){ saveNotifications([]); }

export default { loadNotifications, saveNotifications, addNotification, markRead, getUnreadCount, clearAll };

// UI helper: show a notification in a modal popup (appends modal to body)
export function showNotificationModal(notif, opts={}){
  try{
    // ensure notif object
    if(!notif) return;
    // remove any existing modal (avoid conflicts between list-modal and single-modal)
    const existing = document.getElementById('notif-popup-modal');
    if(existing) existing.remove();
    // create modal container
    let modal = null;
    modal = document.getElementById('notif-popup-modal');
    if(!modal){
      modal = document.createElement('div'); modal.id = 'notif-popup-modal';
      modal.style.position = 'fixed'; modal.style.inset = '0'; modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center'; modal.style.zIndex = '12000';
      const backdrop = document.createElement('div'); backdrop.id = 'notif-popup-backdrop'; backdrop.style.position='fixed'; backdrop.style.inset='0'; backdrop.style.background='rgba(0,0,0,.45)';
      const popup = document.createElement('div'); popup.id = 'notif-popup'; popup.style.position='relative'; popup.style.zIndex='12001'; popup.style.background='#fff'; popup.style.borderRadius='10px'; popup.style.maxWidth='720px'; popup.style.width = 'calc(100% - 40px)'; popup.style.padding='20px'; popup.style.boxShadow='0 8px 32px rgba(0,0,0,.18)';
      const closeBtn = document.createElement('button'); closeBtn.id = 'notif-popup-close'; closeBtn.style.position='absolute'; closeBtn.style.right='10px'; closeBtn.style.top='10px'; closeBtn.style.border='none'; closeBtn.style.background='transparent'; closeBtn.style.fontSize='18px'; closeBtn.style.cursor='pointer'; closeBtn.textContent = '✕';
      const titleEl = document.createElement('h3'); titleEl.id = 'notif-popup-title'; titleEl.style.marginTop = '0'; titleEl.style.marginBottom = '8px';
      const bodyEl = document.createElement('div'); bodyEl.id = 'notif-popup-body'; bodyEl.style.color = '#374151'; bodyEl.style.marginBottom = '12px';
      const metaEl = document.createElement('div'); metaEl.id = 'notif-popup-meta'; metaEl.style.fontSize = '12px'; metaEl.style.color = '#9ca3af'; metaEl.style.marginBottom = '12px';
      const actionWrap = document.createElement('div'); actionWrap.style.textAlign = 'right'; const actionLink = document.createElement('a'); actionLink.id = 'notif-popup-action'; actionLink.className = 'btn btn-ghost'; actionLink.href = '#'; actionLink.style.display = 'none'; actionLink.textContent = '詳細を見る'; actionWrap.appendChild(actionLink);
      popup.appendChild(closeBtn); popup.appendChild(titleEl); popup.appendChild(bodyEl); popup.appendChild(metaEl); popup.appendChild(actionWrap);
      modal.appendChild(backdrop); modal.appendChild(popup); document.body.appendChild(modal);
  // hide header/provider dropdowns to avoid visual overlap
  try{ const hdr = document.getElementById('header-notifs-dropdown'); if(hdr) hdr.style.display = 'none'; }catch{}
  try{ const prov = document.getElementById('prov-notifs-dropdown'); if(prov) prov.style.display = 'none'; }catch{}
  // lock body scroll while modal is open
  try{ document.body.style.overflow = 'hidden'; }catch{}
      document.getElementById('notif-popup-close').addEventListener('click', ()=>{ closeModal(); });
      document.getElementById('notif-popup-backdrop').addEventListener('click', ()=>{ closeModal(); });
    function closeModal(){ const m = document.getElementById('notif-popup-modal'); if(m) m.remove(); try{ document.body.style.overflow = ''; }catch{} }
    }
    // populate
    const titleEl = document.getElementById('notif-popup-title');
    const bodyEl = document.getElementById('notif-popup-body');
    const metaEl = document.getElementById('notif-popup-meta');
    const actionEl = document.getElementById('notif-popup-action');
    if(titleEl) titleEl.textContent = notif.title || '通知';
    if(bodyEl) bodyEl.textContent = notif.body || '';
    if(metaEl) metaEl.textContent = notif.createdAt ? new Date(notif.createdAt).toLocaleString() : '';
    if(actionEl){
      if(notif.data && notif.data.requestId){
        // link based on target type
        const toType = notif.toType || (opts.toType||'user');
        const href = toType === 'provider'
          ? `/pages/provider/requests.html?requestId=${encodeURIComponent(notif.data.requestId)}`
          : `/pages/mypage/reservations.html?requestId=${encodeURIComponent(notif.data.requestId)}`;
        actionEl.setAttribute('href', href);
        actionEl.style.display = 'inline-block';
      } else { actionEl.style.display = 'none'; }
    }
    // mark read
    try{ markRead(notif.id); }catch{}
  }catch(e){ console.warn('showNotificationModal error', e); }
}

// show a centered modal with a list of notifications
export function showNotificationsListModal(notifs, opts={}){
  try{
    const list = Array.isArray(notifs) ? notifs : [];
    // create modal container if not exists
    let modal = document.getElementById('notif-popup-modal');
    if(modal) modal.remove();
    modal = document.createElement('div'); modal.id = 'notif-popup-modal';
    modal.style.position = 'fixed'; modal.style.inset = '0'; modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center'; modal.style.zIndex = '12000';
    const inner = document.createElement('div');
    inner.id = 'notif-popup-list';
    inner.style.position = 'relative'; inner.style.zIndex = '12001'; inner.style.background = '#fff'; inner.style.borderRadius = '10px'; inner.style.maxWidth = '820px'; inner.style.width = 'calc(100% - 40px)'; inner.style.maxHeight = '80vh'; inner.style.overflow = 'auto'; inner.style.padding = '18px'; inner.style.boxShadow = '0 12px 40px rgba(0,0,0,.18)';
  // build inner content safely
  const closeBtn = document.createElement('button'); closeBtn.id = 'notif-popup-close'; closeBtn.style.position='absolute'; closeBtn.style.right='10px'; closeBtn.style.top='10px'; closeBtn.style.border='none'; closeBtn.style.background='transparent'; closeBtn.style.fontSize='18px'; closeBtn.style.cursor='pointer'; closeBtn.textContent = '✕';
  const h3 = document.createElement('h3'); h3.style.margin = '0 0 12px 0'; h3.textContent = '通知';
  const listBody = document.createElement('div'); listBody.id = 'notif-popup-list-body';
  const ctrlWrap = document.createElement('div'); ctrlWrap.style.display = 'flex'; ctrlWrap.style.gap = '8px'; ctrlWrap.style.justifyContent = 'flex-end'; ctrlWrap.style.marginTop = '12px';
  const markAll = document.createElement('button'); markAll.id = 'notif-popup-markall'; markAll.className = 'btn btn-ghost'; markAll.textContent = 'すべて既読';
  const close2 = document.createElement('button'); close2.id = 'notif-popup-close2'; close2.className = 'btn'; close2.textContent = '閉じる';
  ctrlWrap.appendChild(markAll); ctrlWrap.appendChild(close2);
  inner.appendChild(closeBtn); inner.appendChild(h3); inner.appendChild(listBody); inner.appendChild(ctrlWrap);
    const backdrop = document.createElement('div'); backdrop.id = 'notif-popup-backdrop'; backdrop.style.position='fixed'; backdrop.style.inset='0'; backdrop.style.background='rgba(0,0,0,.45)';
  modal.appendChild(backdrop); modal.appendChild(inner); document.body.appendChild(modal);
  // hide header/provider dropdowns to avoid visual overlap
  try{ const hdr = document.getElementById('header-notifs-dropdown'); if(hdr) hdr.style.display = 'none'; }catch{}
  try{ const prov = document.getElementById('prov-notifs-dropdown'); if(prov) prov.style.display = 'none'; }catch{}
  // lock body scroll while modal is open
  try{ document.body.style.overflow = 'hidden'; }catch{}
    const body = document.getElementById('notif-popup-list-body');
    if(body){
      if(list.length===0){ body.textContent = ''; const span = document.createElement('div'); span.className = 'muted'; span.textContent = '現在、新着通知はありません'; body.appendChild(span); }
      else{
          list.forEach(it=>{
            const el = document.createElement('div');
            el.style.padding='10px'; el.style.borderBottom='1px solid #f3f4f6';
            const t = document.createElement('div'); t.style.fontWeight = '700'; t.textContent = it.title || '';
            const b = document.createElement('div'); b.style.fontSize = '13px'; b.style.color = '#6b7280'; b.textContent = it.body || '';
            const meta = document.createElement('div'); meta.style.fontSize = '12px'; meta.style.color = '#9ca3af'; meta.style.marginTop = '6px'; meta.textContent = it.createdAt ? new Date(it.createdAt).toLocaleDateString() : '';
            el.appendChild(t); el.appendChild(b); el.appendChild(meta);
            if(!it.read) el.style.background='#f8fafc';
            el.addEventListener('click', ()=>{ try{ showNotificationModal(it, opts); el.style.background='transparent'; }catch(e){} });
            body.appendChild(el);
          });
      }
    }
  function close(){ const m = document.getElementById('notif-popup-modal'); if(m) m.remove(); try{ document.body.style.overflow = ''; }catch{} }
    document.getElementById('notif-popup-close')?.addEventListener('click', close);
    document.getElementById('notif-popup-close2')?.addEventListener('click', close);
    document.getElementById('notif-popup-backdrop')?.addEventListener('click', close);
    document.getElementById('notif-popup-markall')?.addEventListener('click', ()=>{
      try{ const arr = loadNotifications(); arr.forEach(x=>{ if(list.find(l=> l.id===x.id)) x.read = true; }); saveNotifications(arr); // refresh visuals
  const items = document.querySelectorAll('#notif-popup-list-body > div'); items.forEach(i=> { if(i instanceof HTMLElement) i.style.background='transparent'; });
      }catch(e){}
    });
    // mark displayed notifications as read by default
    try{ const arr = loadNotifications(); let changed=false; for(const x of arr){ if(list.find(l=> l.id===x.id) && !x.read){ x.read = true; changed = true; } } if(changed) saveNotifications(arr); }catch(e){}
  }catch(e){ console.warn('showNotificationsListModal error', e); }
}

// note: showNotificationModal is exported via the function declaration above
