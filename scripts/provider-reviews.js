// @ts-nocheck
import { loadReviews, saveReviews } from './reviews.js';
import { getProviderSession } from './auth.js';
import { loadServices } from './store.js';

function qs(s, root=document){ return root.querySelector(s); }

function renderList(filter='all', serviceId='all'){
  const host = qs('#prov-reviews-list');
  if(!host) return;
  const session = getProviderSession();
  const provId = session?.id;
  const all = loadReviews();
  // Load services and determine which service ids belong to this provider
  let ownedServiceIds = new Set();
  try{
    const services = Array.isArray(loadServices()) ? loadServices() : [];
    for(const s of services){ if(s.providerId === provId){ ownedServiceIds.add(String(s.id)); } }
  }catch{}
  // If reviews store serviceKey, try to map to provider via services list (best-effort)
  // Here we show all reviews and let provider decide; in a real app we'd join services/providers.
  let arr = all.slice().reverse(); // newest first
  // Only keep reviews that belong to this provider's services
  arr = arr.filter(r => {
    try{
      const sk = String(r.serviceKey || '');
      const parts = sk.split(':');
      const candidate = parts.length > 1 ? parts[1] : parts[0];
      return ownedServiceIds.has(String(candidate)) || ownedServiceIds.has(String(r.serviceId||''));
    }catch{ return false; }
  });
  if(filter === 'visible') arr = arr.filter(r=> r.visible !== false);
  if(filter === 'hidden') arr = arr.filter(r=> r.visible === false);
  // Filter by serviceId when provided
  if(serviceId && serviceId !== 'all'){
    arr = arr.filter(r => {
      const sk = r.serviceKey || '';
      // serviceKey might be 'local:<id>' or '<id>' or other slug; try to extract id
      const parts = String(sk).split(':');
      const candidate = parts.length > 1 ? parts[1] : parts[0];
      return candidate === serviceId || String(r.serviceId||'') === serviceId || String(r.serviceKey||'') === serviceId;
    });
  }
  if(arr.length === 0){ host.textContent = ''; const p = document.createElement('p'); p.className = 'muted'; p.textContent = '該当するレビューはありません。'; host.appendChild(p); return; }
  const frag = document.createDocumentFragment();
  for(const r of arr){
    const item = document.createElement('div'); item.className = 'card'; item.style.padding = '12px';
    const cluster = document.createElement('div'); cluster.className = 'cluster'; cluster.style.justifyContent = 'space-between'; cluster.style.alignItems = 'center'; cluster.style.gap = '8px';
    const left = document.createElement('div');
    const strong = document.createElement('strong'); strong.textContent = String(r.userName || (r.user && r.user.name) || '匿名'); left.appendChild(strong);
    const muted = document.createElement('div'); muted.className = 'muted'; muted.style.fontSize = '12px'; muted.textContent = `${String(r.serviceKey||'')} ${r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}`; left.appendChild(muted);
    cluster.appendChild(left);
    const right = document.createElement('div'); right.className = 'cluster'; right.style.gap = '8px';
    const btnToggle = document.createElement('button'); btnToggle.className = 'btn btn--sm btn-toggle'; btnToggle.setAttribute('data-id', r.id); btnToggle.textContent = r.visible === false ? '非表示解除' : '非表示にする';
    const btnDelete = document.createElement('button'); btnDelete.className = 'btn btn--sm btn-delete'; btnDelete.setAttribute('data-id', r.id); btnDelete.textContent = '削除';
    right.appendChild(btnToggle); right.appendChild(btnDelete);
    cluster.appendChild(right);
    item.appendChild(cluster);
    const p = document.createElement('p'); p.style.marginTop = '8px'; p.textContent = String(r.comment || ''); item.appendChild(p);
    frag.appendChild(item);
  }
  host.textContent = ''; host.appendChild(frag);
}

function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function init(){
  const filter = qs('#prov-reviews-filter');
  const host = qs('#prov-reviews-list');
  const svcSelect = qs('#prov-reviews-service');
  // populate service select for this provider
  try{
    const session = getProviderSession();
    const services = Array.isArray(loadServices()) ? loadServices() : [];
    const mine = services.filter(s=> s.providerId === session?.id);
    if(svcSelect){
      // Clear and add default safely
      svcSelect.textContent = '';
      const allOpt = document.createElement('option'); allOpt.value = 'all'; allOpt.textContent = '全てのサービス'; svcSelect.appendChild(allOpt);
      for(const s of mine){ const o = document.createElement('option'); o.value = s.id; o.textContent = s.name || ''; svcSelect.appendChild(o); }
    }
  }catch(e){ console.warn('provider-reviews: failed to load services', e); }

  if(filter){ filter.addEventListener('change', ()=> renderList(filter.value, svcSelect? svcSelect.value : 'all')); }
  if(svcSelect){ svcSelect.addEventListener('change', ()=> renderList(filter? filter.value : 'all', svcSelect.value)); }
  // delegate clicks
  document.addEventListener('click', (e)=>{
    const t = e.target;
    if(t && t.classList && t.classList.contains('btn-toggle')){
      const id = t.getAttribute('data-id');
      const arr = loadReviews();
      const idx = arr.findIndex(x=> x.id === id);
  if(idx !== -1){ arr[idx].visible = arr[idx].visible === false ? true : false; saveReviews(arr); renderList(filter?filter.value:'all', svcSelect? svcSelect.value : 'all'); }
    }
    if(t && t.classList && t.classList.contains('btn-delete')){
      if(!confirm('このレビューを削除しますか？')) return;
      const id = t.getAttribute('data-id');
      const arr = loadReviews();
      const next = arr.filter(x=> x.id !== id);
      saveReviews(next);
      renderList(filter?filter.value:'all', svcSelect? svcSelect.value : 'all');
    }
  });
  renderList('all', svcSelect? svcSelect.value : 'all');
}

// initialize on DOM ready
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
