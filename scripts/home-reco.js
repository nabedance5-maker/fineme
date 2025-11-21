// @ts-nocheck
// Home page: render recommended services (simple heuristic: highest rated, then recent)
const SERVICES_KEY = 'glowup:services';
function $(s, root=document){ return root.querySelector(s); }
function escapeHtml(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function resolvePrefix(){ return location.pathname.includes('/pages/') ? '..' : '.'; }
// compute correct relative path to store.html depending on current page location
function storeBase(){
  try{
    if(location.pathname && location.pathname.indexOf('/pages/') !== -1) return './store.html';
    return './pages/store.html';
  }catch{ return './pages/store.html'; }
}
// compute correct relative path to user schedule page
function scheduleBase(){
  try{
    if(location.pathname && location.pathname.indexOf('/pages/') !== -1) return './user/schedule.html';
    return './pages/user/schedule.html';
  }catch{ return './pages/user/schedule.html'; }
}
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
function labelFromCategory(key){
  const map = {
    consulting: '外見トータルサポート',
    gym: 'パーソナルジム',
    makeup: 'メイクアップ',
    hair: 'ヘア',
    diagnosis: 'カラー/骨格診断',
    fashion: 'コーデ提案',
    photo: '写真撮影（アプリ等）',
    marriage: '結婚相談所',
    eyebrow: '眉毛',
    hairremoval: '脱毛',
    esthetic: 'エステ',
    whitening: 'ホワイトニング',
    orthodontics: '歯科矯正',
    nail: 'ネイル'
  };
  return map[key] || key || '';
}
function loadLocalServices(){ try{ const raw = localStorage.getItem(SERVICES_KEY); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr: []; }catch{ return []; } }
async function loadStaticServices(){
  const rel = `${resolvePrefix()}/scripts/data/services.json`;
  try{ const res = await fetch(rel,{cache:'no-store'}); if(!res.ok) throw new Error(String(res.status)); const data = await res.json(); return Array.isArray(data)? data: []; }catch(e){ try{ const r2=await fetch('/scripts/data/services.json',{cache:'no-store'}); if(!r2.ok) throw new Error(String(r2.status)); const d2=await r2.json(); return Array.isArray(d2)? d2: []; }catch{ return []; } }
}
async function ratingForService(svc){
  try{
    const mod = await import('./reviews.js');
    const key = svc.id ? `local:${svc.id}` : (svc.slug ? `slug:${svc.slug}` : '');
    if(!key) return { count: 0, avg: 0 };
    return mod.ratingSummary(key);
  }catch{ return { count:0, avg:0 }; }
}
function toCardSnapshot(s){
  const price = Number((s.price!=null?s.price:s.priceMin)||s.priceFrom||0);
  const href = s.id ? `${storeBase()}?providerId=${encodeURIComponent(s.providerId||'')}${(typeof s.storeId !== 'undefined' && s.storeId !== null && s.storeId !== '') ? `&storeId=${encodeURIComponent(s.storeId)}` : ''}&tab=menu&serviceId=${encodeURIComponent(s.id)}` : (s.slug? `${storeBase()}?providerId=${encodeURIComponent(s.providerId||'')}${s.storeId? `&storeId=${encodeURIComponent(s.storeId)}` : ''}&tab=menu&serviceId=${encodeURIComponent(s.slug)}` : '#');
  const img = (s.photo||s.image||'').trim();
  return {
    name: s.name,
    region: s.region,
    category: s.category,
    priceFrom: price,
    image: img,
    href,
    placeholder: placeholderFor(s.category),
    providerName: s.providerName || s.provider || '',
    address: s.address || s.access || '',
    providerId: s.providerId || '',
    storeId: s.storeId || '',
    storeName: s.storeName || '',
    slug: s.slug || '',
    serviceId: s.id || s.slug || ''
  };
}
function renderReco(items){
  const host = $('#top-reco'); if(!host) return;
  host.innerHTML = '';
  const frag = document.createDocumentFragment();
  for(const it of items){
  const a = document.createElement('a');
  a.className = 'card';
  // sanitize href with safeUrl helper when available
  try{ a.href = (typeof safeUrl === 'function') ? (safeUrl(it.href) || '#') : (it.href || '#'); }catch(e){ a.href = it.href || '#'; }
  const imgSrc = (it.image && it.image.trim()) ? ((typeof safeUrl === 'function') ? (safeUrl(it.image) || it.placeholder) : it.image) : it.placeholder;
  // build reserve href: try to link to booking page if slug available, otherwise schedule by serviceId, otherwise fallback to href
  const reserveHref = it.slug ? `${resolvePrefix()}/booking/${encodeURIComponent(it.slug)}` : (it.serviceId ? `${scheduleBase()}?serviceId=${encodeURIComponent(it.serviceId)}` : (it.href && it.href.indexOf('detail.html') !== -1 ? it.href.replace('detail.html','booking.html') : it.href + '?reserve=1'));
    // Build elements safely without innerHTML
    const img = document.createElement('img');
    img.className = 'service-thumb';
    img.alt = escapeHtml(it.name || '');
    img.src = imgSrc || it.placeholder || '';
    img.addEventListener('error', ()=>{ img.src = it.placeholder || ''; });

    const body = document.createElement('div'); body.className = 'card-body';
    const h3 = document.createElement('h3'); h3.className = 'card-title'; h3.textContent = it.name || '';
    body.appendChild(h3);
    const meta = document.createElement('p'); meta.className = 'card-meta'; meta.textContent = labelFromCategory(it.category) || '';
    body.appendChild(meta);
    if(it.storeName){
      const p = document.createElement('p'); p.className = 'card-meta';
      const aStore = document.createElement('a');
      try{ aStore.href = (typeof safeUrl === 'function') ? (safeUrl(`${storeBase()}?providerId=${encodeURIComponent(it.providerId||'')}${it.storeId ? `&storeId=${encodeURIComponent(it.storeId)}` : ''}`) || '#') : `${storeBase()}?providerId=${encodeURIComponent(it.providerId||'')}${it.storeId ? `&storeId=${encodeURIComponent(it.storeId)}` : ''}`; }catch(e){ aStore.href = '#'; }
      aStore.textContent = it.storeName || '';
      p.appendChild(aStore);
      body.appendChild(p);
    }else if(it.providerName){
      const pprov = document.createElement('p'); pprov.className = 'card-meta'; pprov.textContent = it.providerName || ''; body.appendChild(pprov);
    }
    if(it.address){ const pad = document.createElement('p'); pad.className = 'card-meta'; pad.textContent = `アクセス：${it.address}`; body.appendChild(pad); }
    if(Number.isFinite(Number(it.priceFrom))){ const pprice = document.createElement('p'); pprice.className = 'card-meta'; pprice.textContent = `料金：¥${Number(it.priceFrom).toLocaleString()}`; body.appendChild(pprice); }
    else { const pprice = document.createElement('p'); pprice.className = 'card-meta'; pprice.textContent = '料金：お問い合わせください'; body.appendChild(pprice); }

    const cluster = document.createElement('div'); cluster.className = 'cluster'; cluster.style.marginTop = '12px'; cluster.style.gap = '8px';
    const detailsBtn = document.createElement('a'); detailsBtn.className = 'btn';
    try{ detailsBtn.href = (typeof safeUrl === 'function') ? (safeUrl(it.href) || '#') : (it.href || '#'); }catch(e){ detailsBtn.href = '#'; }
    detailsBtn.textContent = '詳細を見る';
    const reserveBtn = document.createElement('a'); reserveBtn.className = 'btn'; reserveBtn.href = reserveHref || '#'; reserveBtn.textContent = '予約へ進む';
    cluster.appendChild(detailsBtn); cluster.appendChild(reserveBtn);
    body.appendChild(cluster);

    a.appendChild(img);
    a.appendChild(body);
    frag.appendChild(a);
  }
  host.appendChild(frag);
  // Dim partially visible cards at both edges
  const updateDim = () => {
    const rect = host.getBoundingClientRect();
    const leftEdge = rect.left + 1; // slight inset to avoid subpixel flicker
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
  // gather candidates from local first (published only), then static
  const local = loadLocalServices().filter(s=> s && s.published);
  const stat = await loadStaticServices();
  const all = [...local, ...stat];
  if(all.length === 0){ return; }
  // score: rating avg, then count, then has photo, then recent updated/created
  const scored = [];
  for(const s of all){
    const { avg, count } = await ratingForService(s);
    const hasPhoto = (s.photo||s.image)? 1: 0;
    const ts = new Date(s.updatedAt||s.createdAt||0).getTime() || 0;
    const score = avg*100 + count*2 + hasPhoto + (ts/1e13); // scale time small
    scored.push({ s, score, avg, count });
  }
  scored.sort((a,b)=> b.score - a.score);
  const top = scored.slice(0, 6).map(x=> toCardSnapshot(x.s));
  renderReco(top);
})();
