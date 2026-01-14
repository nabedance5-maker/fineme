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
    nail: 'ネイル',
    aga: 'AGA'
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
async function renderReco(items){
  const host = $('#top-reco'); if(!host) return;
  host.innerHTML = '';
  const frag = document.createDocumentFragment();
  for(const it of items){
  const a = document.createElement('a');
  a.className = 'card'; a.classList.add('skeleton');
  try{ a.dataset.origin = 'home'; a.dataset.serviceId = String(it.serviceId||''); }catch{}
  // sanitize href with safeUrl helper when available
  try{ a.href = (typeof safeUrl === 'function') ? (safeUrl(it.href) || '#') : (it.href || '#'); }catch(e){ a.href = it.href || '#'; }
  const imgSrc = (it.image && it.image.trim()) ? ((typeof safeUrl === 'function') ? (safeUrl(it.image) || it.placeholder) : it.image) : it.placeholder;
  // build reserve href: try to link to booking page if slug available, otherwise schedule by serviceId, otherwise fallback to href
  const reserveHref = it.slug ? `${resolvePrefix()}/booking/${encodeURIComponent(it.slug)}?origin=home` : (it.serviceId ? `${scheduleBase()}?serviceId=${encodeURIComponent(it.serviceId)}&origin=home` : (it.href && it.href.indexOf('detail.html') !== -1 ? it.href.replace('detail.html','booking.html')+'?origin=home' : it.href + (it.href.includes('?')?'&':'?') + 'reserve=1&origin=home'));
    // Build elements safely without innerHTML
    const img = document.createElement('img');
    img.className = 'service-thumb';
    img.alt = escapeHtml(it.name || '');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = imgSrc || it.placeholder || '';
    img.addEventListener('error', ()=>{ img.src = it.placeholder || ''; a.classList.remove('skeleton'); });
    img.addEventListener('load', ()=>{ a.classList.remove('skeleton'); });

    const body = document.createElement('div'); body.className = 'card-body';
    // 相性理由とバッジ群
    const tagsWrap = document.createElement('div'); tagsWrap.className = 'cluster'; tagsWrap.style.gap = '6px'; tagsWrap.style.flexWrap = 'wrap'; tagsWrap.style.alignItems = 'center';
    try{
      let diag = null;
      try{
        const mod = await import('./user-auth.js').catch(()=>null);
        const sess = mod && typeof mod.getUserSession === 'function' ? mod.getUserSession() : null;
        if(sess && (sess.id || sess.userId || sess.email)){
          const raw = localStorage.getItem('fineme:diagnosis:latest');
          diag = raw ? JSON.parse(raw) : null;
        }
      }catch{}
      if(diag && it.providerId){
        const matchMod = await import('./matching.js').catch(()=>null);
        if(matchMod){
          // provider: local first, static fallback
          let prov = null;
          try{ const localRaw = localStorage.getItem('glowup:providers'); const arr = localRaw? JSON.parse(localRaw):[]; if(Array.isArray(arr)) prov = arr.find(p=> p && p.id===it.providerId) || null; }catch{}
          if(!prov){ try{ const r=await fetch(`${resolvePrefix()}/scripts/data/providers.json`,{cache:'no-store'}); if(r.ok){ const arr=await r.json(); prov = (Array.isArray(arr)? arr.find(p=> p && p.id===it.providerId): null) || null; } }catch{}
          }
          const user = matchMod.getUserAxesFromDiagnosis(diag);
          const shop = matchMod.getShopScoresFromProvider(prov||{});
          const comp = matchMod.computeCompatibilityAxes(user, shop);
          const reason = matchMod.computeReasonLine(user, shop, comp);
          if(reason){ const p = document.createElement('p'); p.style.margin='0 0 6px 0'; p.style.fontWeight='600'; p.textContent = `あなたに近い理由: ${reason}`; body.appendChild(p); }
          // タイプ対応
          try{
            const typeName = String(diag?.step2?.classification?.type_name || diag?.intent?.type_name || '');
            const whatTypes = prov && prov.onboarding && prov.onboarding.profile && Array.isArray(prov.onboarding.profile.whatTypes) ? prov.onboarding.profile.whatTypes : [];
            if(typeName){ const b=document.createElement('span'); b.className='badge'; b.textContent = whatTypes && whatTypes.length ? (whatTypes.includes(String(diag?.intent?.type_id||''))? `タイプ対応: ${typeName}に強い` : `タイプ対応: ${typeName}`) : `タイプ対応: ${typeName}`; tagsWrap.appendChild(b); }
          }catch{}
          // 軸バッジ
          try{
            const ax = (diag?.step2?.scores?.axes)||{};
            const pairs = [ ['A', Number(ax.motivation||0)], ['B', Number(ax.support||0)], ['C', Number(ax.change||0)], ['D', Number(ax.control||0)] ];
            pairs.sort((a,b)=> b[1]-a[1]); const map={ A:'納得', B:'寄り添い', C:'最短', D:'進め方' };
            for(const p of pairs.slice(0,2)){ const b=document.createElement('span'); b.className='badge'; b.textContent = map[p[0]] || p[0]; tagsWrap.appendChild(b); }
            const val = String(ax.value||''); if(val){ const b=document.createElement('span'); b.className='badge'; b.textContent = `世界観:${val}`; tagsWrap.appendChild(b); }
          }catch{}
          // 具体性・信頼
          try{
            const spec = matchMod.scoreServiceSpecificity(it)||0; const trust = matchMod.scoreProfileTrust(prov)||0;
            const b1=document.createElement('span'); b1.className='badge'; b1.textContent = spec>=0.7? '具体度:高' : (spec>=0.4? '具体度:中':'具体度:低'); tagsWrap.appendChild(b1);
            const b2=document.createElement('span'); b2.className='badge'; b2.textContent = trust>=0.7? 'プロフィール充実:高' : (trust>=0.4? 'プロフィール充実:中':'プロフィール充実:低'); tagsWrap.appendChild(b2);
          }catch{}
        }
      }
    }catch{}
    const h3 = document.createElement('h3'); h3.className = 'card-title'; h3.textContent = it.name || '';
    body.appendChild(h3);
    const meta = document.createElement('p'); meta.className = 'card-meta'; meta.textContent = labelFromCategory(it.category) || '';
    body.appendChild(meta);
    if(tagsWrap.childNodes && tagsWrap.childNodes.length){ body.appendChild(tagsWrap); }
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
    // 初回の流れ要約/安心シグナル
    try{
      const plan = (it.firstSessionPlan||'').trim(); const risk = (it.riskPolicy||'').trim(); const qas = Array.isArray(it.qaList)? it.qaList: [];
      if(plan){ const p=document.createElement('p'); p.className='card-meta'; const txt = plan.length>42? plan.slice(0,42)+'…': plan; p.textContent = `初回の流れ: ${txt}`; body.appendChild(p); }
      const signals = [];
      if(risk){ signals.push('リスク方針あり'); }
      if(qas && qas.length>0){ signals.push(`Q&A ${qas.length}件`); }
      if(signals.length){ const p=document.createElement('p'); p.className='card-meta'; p.textContent = signals.join(' / '); body.appendChild(p); }
    }catch{}
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
  // Accessibility: keyboard horizontal scroll and label
  try{ host.setAttribute('tabindex','0'); host.setAttribute('aria-label','おすすめサービス'); }catch{}
  try{
    host.addEventListener('keydown', (ev)=>{
      const key = ev.key;
      const step = Math.max(120, host.clientWidth/3);
      if(key==='ArrowRight'){ host.scrollBy({ left: step, behavior:'smooth' }); ev.preventDefault(); }
      else if(key==='ArrowLeft'){ host.scrollBy({ left: -step, behavior:'smooth' }); ev.preventDefault(); }
      else if(key==='Home'){ host.scrollTo({ left: 0, behavior:'smooth' }); }
      else if(key==='End'){ host.scrollTo({ left: host.scrollWidth, behavior:'smooth' }); }
    });
  }catch{}
  // Analytics: record origin when clicking a card
  try{
    host.addEventListener('click', (ev)=>{
      const t = ev.target; const link = (t && t.closest) ? t.closest('a') : null;
      if(link){ try{ sessionStorage.setItem('fineme:last-origin','home'); }catch{} try{ const key='fineme:analytics'; const raw=localStorage.getItem(key); const arr=raw?JSON.parse(raw):[]; const evt={ type:'click_card', ts:new Date().toISOString(), origin:'home', serviceId: link.dataset ? (link.dataset.serviceId||'') : '' }; arr.push(evt); localStorage.setItem(key, JSON.stringify(arr)); }catch{} }
    });
  }catch{}
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
  // Prefetch next images to improve horizontal scroll UX
  try{
    const cards = Array.from(host.querySelectorAll('.card'));
    const preloadImg = (img) => { try{ if(img && !img.dataset.prefetched){ const p = new Image(); p.src = img.src; img.dataset.prefetched = '1'; } }catch{} };
    const updatePrefetch = () => {
      try{
        const rect = host.getBoundingClientRect();
        let rightmostIdx = -1;
        for(let i=0;i<cards.length;i++){
          const r = cards[i].getBoundingClientRect();
          const fullyVisible = r.left >= rect.left && r.right <= rect.right;
          if(fullyVisible) rightmostIdx = i;
        }
        // Preload next 2 images to the right
        for(const offset of [1,2]){
          const idx = rightmostIdx + offset;
          if(idx >= 0 && idx < cards.length){ const img = cards[idx].querySelector('img'); preloadImg(img); }
        }
      }catch{}
    };
    updatePrefetch();
    host.addEventListener('scroll', ()=> { window.requestAnimationFrame(updatePrefetch); });
    window.addEventListener('resize', updatePrefetch);
  }catch{}
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
  await renderReco(top);
})();
