// @ts-nocheck
// Home page: render recently viewed services for logged-in users
function $(s, root=document){ return root.querySelector(s); }
function escapeHtml(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function resolvePrefix(){ return location.pathname.includes('/pages/') ? '..' : '.'; }
function placeholderFor(category){
  const prefix = resolvePrefix();
  const map = {
    consulting: `${prefix}/assets/placeholders/placeholder-consulting.svg`,
    gym: `${prefix}/assets/placeholders/placeholder-gym.svg`,
    makeup: `${prefix}/assets/placeholders/placeholder-makeup.svg`,
    hair: `${prefix}/assets/placeholders/placeholder-hair.svg`,
    diagnosis: `${prefix}/assets/placeholders/placeholder-diagnosis.svg`,
    fashion: `${prefix}/assets/placeholders/placeholder-fashion.svg`,
    photo: `${prefix}/assets/placeholders/placeholder-photo.svg`,
    marriage: `${prefix}/assets/placeholders/placeholder-marriage.svg`,
  };
  return map[category] || `${prefix}/assets/placeholders/placeholder-default.svg`;
}

function toCardSnapshot(hist){
  // hist from history.js: { href, name, region, category, priceFrom, image, providerName, providerId, viewedAt }
  const href = hist.href?.startsWith('/') ? `${resolvePrefix()}${hist.href}` : (hist.href||'#');
  const img = (hist.image||'').trim();
  return {
    name: hist.name || '(名称未設定)',
    region: hist.region || '',
    category: hist.category || '',
    priceFrom: hist.priceFrom,
    image: img,
    href,
    placeholder: placeholderFor(hist.category)
  };
}

function renderRecent(items){
  const section = $('#recent-section');
  const host = $('#top-recent');
  if(!section || !host) return;
  if(!items || !items.length){ section.style.display='none'; host.innerHTML=''; return; }
  section.style.display='';
  host.innerHTML = '';
  const frag = document.createDocumentFragment();
  for(const it of items){
    const a = document.createElement('a'); a.className = 'card'; a.href = it.href;
    const imgSrc = it.image && it.image.trim() ? it.image : it.placeholder;
    const img = document.createElement('img'); img.className = 'service-thumb';
    try{ img.src = (typeof safeUrl === 'function' ? (safeUrl(imgSrc) || it.placeholder) : (imgSrc || it.placeholder)); }catch{ img.src = it.placeholder; }
    img.alt = String(it.name || '');
    img.addEventListener('error', ()=>{ try{ img.onerror = null; img.src = it.placeholder; }catch{} });
    const body = document.createElement('div'); body.className = 'card-body';
    const h3 = document.createElement('h3'); h3.className = 'card-title'; h3.textContent = it.name || '';
    const meta = document.createElement('p'); meta.className = 'card-meta'; meta.textContent = `${it.region || ''} / ${it.category || ''}`;
    body.appendChild(h3); body.appendChild(meta);
    if(Number.isFinite(Number(it.priceFrom))){ const p = document.createElement('p'); p.className = 'card-meta'; p.textContent = `¥${Number(it.priceFrom).toLocaleString()}`; body.appendChild(p); }
    a.appendChild(img); a.appendChild(body);
    frag.appendChild(a);
  }
  host.appendChild(frag);
  const updateDim = () => {
    const rect = host.getBoundingClientRect();
    const leftEdge = rect.left + 1;
    const rightEdge = rect.right - 1;
    for(const el of host.querySelectorAll('.card')){
      const r = el.getBoundingClientRect();
      const fullyVisible = r.left >= leftEdge && r.right <= rightEdge;
      el.classList.toggle('is-dimmed', !fullyVisible);
    }
  };
  updateDim();
  host.addEventListener('scroll', ()=> { window.requestAnimationFrame(updateDim); });
  window.addEventListener('resize', updateDim);
}

(async function init(){
  try{
    const auth = await import('./user-auth.js');
    const session = auth && typeof auth.getUserSession === 'function' ? auth.getUserSession() : null;
    if(!session){ renderRecent([]); return; }
    const modH = await import('./history.js');
    const raw = modH.loadHistory ? modH.loadHistory() : [];
    // Deduplicate by canonical href and keep recent order already ensured by addHistory
    const seen = new Set();
    const unique = [];
    for(const it of raw){
      const href = modH.canonicalDetailHref ? modH.canonicalDetailHref(it.href) : (it.href||'');
      if(!href || seen.has(href)) continue;
      seen.add(href);
      unique.push(it);
      if(unique.length >= 12) break; // limit cards
    }
    const cards = unique.map(toCardSnapshot);
    renderRecent(cards);
  }catch(e){ renderRecent([]); }
})();
