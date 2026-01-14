// @ts-nocheck
// Home page: Render "あなたに近い候補" from user's diagnosis
const SERVICES_KEY = 'glowup:services';
const PROVIDERS_KEY = 'glowup:providers';
function $(s, root=document){ return root.querySelector(s); }
function resolvePrefix(){ try{ return location.pathname.includes('/pages/') ? '..' : '.'; }catch{ return '.'; } }
function storeBase(){ try{ return location.pathname.includes('/pages/') ? './store.html' : './pages/store.html'; }catch{ return './pages/store.html'; } }
function scheduleBase(){ try{ return location.pathname.includes('/pages/') ? './user/schedule.html' : './pages/user/schedule.html'; }catch{ return './pages/user/schedule.html'; } }
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
    eyebrow: `${prefix}/assets/placeholders/placeholder-eyebrow.svg`,
    hairremoval: `${prefix}/assets/placeholders/placeholder-hairremoval.svg`,
    esthetic: `${prefix}/assets/placeholders/placeholder-esthetic.svg`,
    whitening: `${prefix}/assets/placeholders/placeholder-whitening.svg`,
    orthodontics: `${prefix}/assets/placeholders/placeholder-orthodontics.svg`,
    nail: `${prefix}/assets/placeholders/placeholder-nail.svg`
  };
  return map[category] || `${prefix}/assets/placeholders/placeholder-default.svg`;
}
function labelFromCategory(key){
  const map = {
    consulting: '外見トータルサポート', gym: 'パーソナルジム', makeup: 'メイクアップ', hair: 'ヘア', diagnosis: 'カラー/骨格診断',
    fashion: 'コーデ提案', photo: '写真撮影（アプリ等）', marriage: '結婚相談所', eyebrow: '眉毛', hairremoval: '脱毛',
    esthetic: 'エステ', whitening: 'ホワイトニング', orthodontics: '歯科矯正', nail: 'ネイル', aga: 'AGA'
  }; return map[key] || key || '';
}
function loadDiagnosis(){ try{ const raw = localStorage.getItem('fineme:diagnosis:latest'); return raw? JSON.parse(raw): null; }catch{ return null; } }
function isLoggedIn(){
  try{
    const mod = window && window.getUserSession ? { getUserSession: window.getUserSession } : null;
    const sess = mod && typeof mod.getUserSession === 'function' ? mod.getUserSession() : null;
    if(sess && (sess.id || sess.userId || sess.email)) return true;
    const raw = sessionStorage.getItem('glowup:userSession');
    if(!raw) return false; const s = JSON.parse(raw);
    return !!(s && (s.id || s.userId || s.email));
  }catch{ return false; }
}
function loadLocalServices(){ try{ const raw = localStorage.getItem(SERVICES_KEY); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr.filter(s=> s && s.published): []; }catch{ return []; } }
async function loadStaticServices(){
  const rel = `${resolvePrefix()}/scripts/data/services.json`;
  try{ const res = await fetch(rel,{cache:'no-store'}); if(!res.ok) throw new Error(String(res.status)); const data = await res.json(); return Array.isArray(data)? data: []; }
  catch(e){ try{ const r2=await fetch('/scripts/data/services.json',{cache:'no-store'}); if(!r2.ok) throw new Error(String(r2.status)); const d2=await r2.json(); return Array.isArray(d2)? d2: []; }catch{ return []; } }
}
async function loadStaticProviders(){
  const rel = `${resolvePrefix()}/scripts/data/providers.json`;
  try{ const res = await fetch(rel,{cache:'no-store'}); if(!res.ok) throw new Error(String(res.status)); const data = await res.json(); return Array.isArray(data)? data: []; }
  catch(e){ try{ const r2=await fetch('/scripts/data/providers.json',{cache:'no-store'}); if(!r2.ok) throw new Error(String(r2.status)); const d2=await r2.json(); return Array.isArray(d2)? d2: []; }catch{ return []; } }
}
function buildProvMap(){
  try{ const localRaw = localStorage.getItem(PROVIDERS_KEY); const localArr = localRaw? JSON.parse(localRaw):[]; return Array.isArray(localArr)? Object.fromEntries(localArr.map(p=>[p.id,p])): {}; }catch{ return {}; }
}
function toCardSnapshot(s){
  const price = Number((s.price!=null?s.price:s.priceMin)||s.priceFrom||0);
  const href = s.id ? `${storeBase()}?providerId=${encodeURIComponent(s.providerId||'')}${(typeof s.storeId !== 'undefined' && s.storeId !== null && s.storeId !== '') ? `&storeId=${encodeURIComponent(s.storeId)}` : ''}&tab=menu&serviceId=${encodeURIComponent(s.id)}`
    : (s.slug? `${storeBase()}?providerId=${encodeURIComponent(s.providerId||'')}${s.storeId? `&storeId=${encodeURIComponent(s.storeId)}` : ''}&tab=menu&serviceId=${encodeURIComponent(s.slug)}` : '#');
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
function reserveHrefFor(it){
  if(it.slug) return `${resolvePrefix()}/booking/${encodeURIComponent(it.slug)}?origin=home-type`;
  if(it.serviceId) return `${scheduleBase()}?serviceId=${encodeURIComponent(it.serviceId)}&origin=home-type`;
  return (it.href || '#');
}
async function renderCards(items){
  const host = $('#type-candidates-list'); if(!host) return;
  host.innerHTML = '';
  const frag = document.createDocumentFragment();
  for(const it of items){
    const a = document.createElement('a'); a.className = 'card'; a.href = it.href || '#';
    try{ a.dataset.origin = 'home-type'; a.dataset.serviceId = String(it.serviceId||''); }catch{}
    a.classList.add('skeleton');
    const img = document.createElement('img'); img.className = 'service-thumb'; img.alt = String(it.name||''); img.loading = 'lazy'; img.decoding = 'async'; img.src = (it.image && it.image.trim()) ? it.image : (it.placeholder||''); img.addEventListener('error',()=>{ img.src = it.placeholder||''; a.classList.remove('skeleton'); }); img.addEventListener('load', ()=>{ a.classList.remove('skeleton'); });
    const body = document.createElement('div'); body.className = 'card-body';
    const tagsWrap = document.createElement('div'); tagsWrap.className = 'cluster'; tagsWrap.style.gap = '6px'; tagsWrap.style.flexWrap = 'wrap'; tagsWrap.style.alignItems = 'center';
    // 相性理由一行（診断×提供側）をタイトルより上に表示（おすすめサービスと同様）
    try{
      const diag = loadDiagnosis();
      if(diag && it.providerId){
        const matchMod = await import('./matching.js').catch(()=>null);
        if(matchMod){
          // build provider map: local + static
          let prov = null;
          try{
            const localRaw = localStorage.getItem(PROVIDERS_KEY); const localArr = localRaw? JSON.parse(localRaw):[];
            if(Array.isArray(localArr)) prov = localArr.find(p=> p && p.id===it.providerId) || null;
          }catch{}
          if(!prov){
            try{ const rel = `${resolvePrefix()}/scripts/data/providers.json`; const r=await fetch(rel,{cache:'no-store'}); if(r.ok){ const arr = await r.json(); prov = (Array.isArray(arr)? arr.find(p=> p && p.id===it.providerId): null) || null; } }catch{}
          }
          const user = matchMod.getUserAxesFromDiagnosis(diag);
          const shop = matchMod.getShopScoresFromProvider(prov||{});
          const comp = matchMod.computeCompatibilityAxes(user, shop);
          const reason = matchMod.computeReasonLine(user, shop, comp);
          if(reason){ const p = document.createElement('p'); p.style.margin='0 0 6px 0'; p.style.fontWeight='600'; p.textContent = `あなたに近い理由: ${reason}`; body.appendChild(p); }
          // タイプ対応バッジ
          // タイプ対応バッジ（最優先）
          try{
            const typeName = String(diag?.step2?.classification?.type_name || diag?.intent?.type_name || '');
            const whatTypes = prov && prov.onboarding && prov.onboarding.profile && Array.isArray(prov.onboarding.profile.whatTypes) ? prov.onboarding.profile.whatTypes : [];
            if(typeName){ const b = document.createElement('span'); b.className='badge'; b.textContent = whatTypes && whatTypes.length ? (whatTypes.includes(String(diag?.intent?.type_id||''))? `タイプ対応: ${typeName}に強い` : `タイプ対応: ${typeName}`) : `タイプ対応: ${typeName}`; tagsWrap.appendChild(b); }
          }catch{}
          // 安心シグナル（上段）
          try{
            const risk = (it.riskPolicy||'').trim(); const qas = Array.isArray(it.qaList)? it.qaList: [];
            if(risk){ const b=document.createElement('span'); b.className='badge'; b.textContent='リスク方針あり'; tagsWrap.appendChild(b); }
            if(qas && qas.length>0){ const b=document.createElement('span'); b.className='badge'; b.textContent=`Q&A ${qas.length}件`; tagsWrap.appendChild(b); }
          }catch{}
          // 軸バッジ（A/B/C/D/Eから上位2）
          try{
            const ax = (diag?.step2?.scores?.axes)||{};
            const pairs = [ ['A', Number(ax.motivation||0)], ['B', Number(ax.support||0)], ['C', Number(ax.change||0)], ['D', Number(ax.control||0)] ];
            pairs.sort((a,b)=> b[1]-a[1]);
            const map={ A:'納得', B:'寄り添い', C:'最短', D:'進め方' };
            for(const p of pairs.slice(0,2)){ const b=document.createElement('span'); b.className='badge'; b.textContent = map[p[0]] || p[0]; tagsWrap.appendChild(b); }
            const val = String(ax.value||''); if(val){ const b=document.createElement('span'); b.className='badge'; b.textContent = `世界観:${val}`; tagsWrap.appendChild(b); }
          }catch{}
          // 具体性・信頼バッジ
          // 具体性・プロフィール充実（最後にまとめ）
          try{
            const spec = matchMod.scoreServiceSpecificity(it)||0; const trust = matchMod.scoreProfileTrust(prov)||0;
            const b1=document.createElement('span'); b1.className='badge'; b1.textContent = spec>=0.7? '具体度:高' : (spec>=0.4? '具体度:中':'具体度:低'); tagsWrap.appendChild(b1);
            const b2=document.createElement('span'); b2.className='badge'; b2.textContent = trust>=0.7? 'プロフィール充実:高' : (trust>=0.4? 'プロフィール充実:中':'プロフィール充実:低'); tagsWrap.appendChild(b2);
          }catch{}
        }
      }
    }catch{}
    const h3 = document.createElement('h3'); h3.className='card-title'; h3.textContent = it.name || ''; body.appendChild(h3);
    const cat = document.createElement('p'); cat.className='card-meta'; cat.textContent = labelFromCategory(it.category); body.appendChild(cat);
    // 相性理由一行（診断×提供側）
    if(tagsWrap.childNodes && tagsWrap.childNodes.length){ body.appendChild(tagsWrap); }
    if(it.storeName){ const p=document.createElement('p'); p.className='card-meta'; const link=document.createElement('a'); link.href = `${storeBase()}?providerId=${encodeURIComponent(it.providerId||'')}${it.storeId? `&storeId=${encodeURIComponent(it.storeId)}`:''}`; link.textContent = it.storeName; p.appendChild(link); body.appendChild(p); }
    else if(it.providerName){ const p=document.createElement('p'); p.className='card-meta'; p.textContent = it.providerName; body.appendChild(p); }
    if(it.address){ const pad=document.createElement('p'); pad.className='card-meta'; pad.textContent = `アクセス：${it.address}`; body.appendChild(pad); }
    // 初回の流れ要約/安心シグナル
    // 初回の流れ要約（短文化）
    try{
      const plan = (it.firstSessionPlan||'').trim(); const risk = (it.riskPolicy||'').trim(); const qas = Array.isArray(it.qaList)? it.qaList: [];
      if(plan){ const p=document.createElement('p'); p.className='card-meta'; const txt = plan.length>28? plan.slice(0,28)+'…': plan; p.textContent = `初回の流れ: ${txt}`; body.appendChild(p); }
    }catch{}
    if(Number.isFinite(Number(it.priceFrom))){ const pp=document.createElement('p'); pp.className='card-meta'; pp.textContent = `料金：¥${Number(it.priceFrom).toLocaleString()}`; body.appendChild(pp); }
    const controls = document.createElement('div'); controls.className='cluster'; controls.style.gap='8px'; controls.style.marginTop='10px';
    const details = document.createElement('a'); details.className='btn'; details.href = it.href || '#'; details.textContent = '詳細を見る';
    const reserve = document.createElement('a'); reserve.className='btn'; reserve.href = reserveHrefFor(it); reserve.textContent = '予約へ進む';
    const fav = document.createElement('button'); fav.type='button'; fav.className='btn btn-ghost'; fav.textContent = '少し考えるために保存する'; fav.setAttribute('aria-pressed','false');
    controls.appendChild(details); controls.appendChild(reserve); controls.appendChild(fav); body.appendChild(controls);
    // 保存（お気に入り）ボタンの動作: 未ログインならモーダルで促す／ログイン済みならお気に入り保存
    try{
      const snapshot = { href: it.href || '#', name: it.name||'', region: it.region||'', category: it.category||'', priceFrom: it.priceFrom, image: (it.image||'').trim() ? it.image : (it.placeholder||''), providerName: it.providerName||'', providerId: it.providerId||'' };
      const ensureAuthPrompt = ()=>{
        let bd = document.getElementById('home-auth-prompt-backdrop');
        let modal = document.getElementById('home-auth-prompt-modal');
        let closeBtn = document.getElementById('home-auth-prompt-close');
        let login = document.getElementById('home-auth-prompt-login');
        let register = document.getElementById('home-auth-prompt-register');
        // create if missing
        if(!bd || !modal){
          bd = document.createElement('div'); bd.id='home-auth-prompt-backdrop'; bd.className='modal-backdrop'; bd.hidden=true; bd.style.zIndex='11000';
          // inline essential styles for backdrop
          bd.style.position='fixed'; bd.style.left='0'; bd.style.top='0'; bd.style.right='0'; bd.style.bottom='0'; bd.style.background='rgba(0,0,0,.45)'; bd.style.backdropFilter='blur(2px)';
          modal = document.createElement('div'); modal.id='home-auth-prompt-modal'; modal.className='modal'; modal.hidden=true; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.setAttribute('aria-labelledby','home-auth-prompt-title'); modal.style.zIndex='11001';
          // inline essential styles for modal container
          modal.style.position='fixed'; modal.style.left='0'; modal.style.top='0'; modal.style.right='0'; modal.style.bottom='0'; modal.style.display='flex'; modal.style.alignItems='center'; modal.style.justifyContent='center'; modal.style.padding='24px';
          const content = document.createElement('div'); content.className='modal-content card'; content.style.padding='20px'; content.style.width='min(100%,440px)';
          const header = document.createElement('div'); header.className='cluster'; header.style.justifyContent='space-between'; header.style.alignItems='center'; header.style.marginBottom='8px';
          const h2 = document.createElement('h2'); h2.id='home-auth-prompt-title'; h2.style.margin='0'; h2.textContent='ログインまたは新規登録してください';
          closeBtn = document.createElement('button'); closeBtn.id='home-auth-prompt-close'; closeBtn.className='btn btn-ghost'; closeBtn.type='button'; closeBtn.setAttribute('aria-label','閉じる'); closeBtn.textContent='×';
          header.appendChild(h2); header.appendChild(closeBtn);
          const p = document.createElement('p'); p.className='muted'; p.textContent='お気に入りを保存するにはログインが必要です。続行するにはログインまたは新規登録をしてください。';
          const actions = document.createElement('div'); actions.className='cluster'; actions.style.justifyContent='flex-end'; actions.style.marginTop='12px'; actions.style.gap='8px';
          login = document.createElement('a'); login.id='home-auth-prompt-login'; login.className='btn'; login.href='/pages/user/login.html'; login.textContent='ログイン';
          register = document.createElement('a'); register.id='home-auth-prompt-register'; register.className='btn btn-ghost'; register.href='/pages/user/login.html#register'; register.textContent='新規登録';
          actions.appendChild(register); actions.appendChild(login);
          content.appendChild(header); content.appendChild(p); content.appendChild(actions); modal.appendChild(content);
          document.body.appendChild(bd); document.body.appendChild(modal);
        }
        const open = ()=>{ try{ bd.hidden=false; bd.style.display='block'; modal.hidden=false; modal.style.display='flex'; modal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open'); modal.focus && modal.focus(); }catch{} };
        const close = ()=>{ try{ bd.hidden=true; bd.style.display='none'; modal.hidden=true; modal.style.display='none'; modal.setAttribute('aria-hidden','true'); document.body.classList.remove('modal-open'); }catch{} };
        // rebind listeners each time to be safe
        try{
          if(closeBtn){ closeBtn.onclick = (ev)=>{ ev.preventDefault(); ev.stopPropagation(); close(); }; }
          if(bd){ bd.onclick = (ev)=>{ ev.preventDefault(); close(); }; }
          // ESC to close
          window.addEventListener('keydown', (ev)=>{ if(ev.key==='Escape'){ close(); } }, { once:true });
        }catch{}
        return { bd, modal, open, close, login, register };
      };
      // initial visual state based on favorites
      try{
        const favMod = await import('./favorites.js');
        const on = favMod.isFavorited(snapshot.href);
        fav.setAttribute('aria-pressed', on? 'true':'false');
        fav.textContent = on ? '保存済み' : '少し考えるために保存する';
      }catch{}
      fav.addEventListener('click', async (ev)=>{
        ev.preventDefault(); ev.stopPropagation();
        try{
          const auth = await import('./user-auth.js');
          const session = auth && typeof auth.getUserSession === 'function' ? auth.getUserSession() : null;
          if(!session){
            const { open, login, register } = ensureAuthPrompt();
            // store pending favorite and set next to current page (resume)
            try{
              sessionStorage.setItem('fineme:pending-favorite', JSON.stringify(snapshot));
              const next = location.pathname + location.search + (location.search ? '&' : '?') + 'resumeFav=1';
              login.setAttribute('href', `/pages/user/login.html?next=${encodeURIComponent(next)}`);
              register.setAttribute('href', `/pages/user/login.html?next=${encodeURIComponent(next)}#register`);
            }catch{}
            open && open();
            return;
          }
        }catch{}
        try{
          const favMod = await import('./favorites.js');
          const { addFavorite, isFavorited } = favMod;
          addFavorite(snapshot);
          const on = isFavorited(snapshot.href);
          fav.setAttribute('aria-pressed', on? 'true':'false');
          fav.textContent = on ? '保存済み' : '少し考えるために保存する';
        }catch{}
      });
    }catch{}
    a.appendChild(img); a.appendChild(body); frag.appendChild(a);
  }
  host.appendChild(frag);
  // Accessibility: allow keyboard horizontal scroll
  try{ host.setAttribute('tabindex','0'); host.setAttribute('aria-label','あなたに近い候補'); }catch{}
  try{ host.addEventListener('keydown', (ev)=>{ const key=ev.key; const step = Math.max(120, host.clientWidth/3); if(key==='ArrowRight'){ host.scrollBy({ left: step, behavior:'smooth' }); ev.preventDefault(); } else if(key==='ArrowLeft'){ host.scrollBy({ left: -step, behavior:'smooth' }); ev.preventDefault(); } else if(key==='Home'){ host.scrollTo({ left: 0, behavior:'smooth' }); } else if(key==='End'){ host.scrollTo({ left: host.scrollWidth, behavior:'smooth' }); } }); }catch{}
  // Analytics: record origin for subsequent reservation flow
  try{ host.addEventListener('click', (ev)=>{ const t = /** @type {HTMLElement} */(ev.target); const a = t && t.closest ? t.closest('a') : null; if(a){ try{ sessionStorage.setItem('fineme:last-origin','home-type'); }catch{} try{ const key='fineme:analytics'; const raw=localStorage.getItem(key); const arr=raw?JSON.parse(raw):[]; const evt={ type:'click_card', ts:new Date().toISOString(), origin:'home-type', serviceId: a.dataset ? (a.dataset.serviceId||'') : '' }; arr.push(evt); localStorage.setItem(key, JSON.stringify(arr)); }catch{} } }); }catch{}
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
// Recommend categories from diagnosis (simple mapping)
function recommendCategories(diag){
  const typeId = String(diag?.intent?.type_id || diag?.step2?.classification?.type_id || '');
  const TYPE_BASE = {
    w01: ['consulting','eyebrow','hair','diagnosis'],
    w02: ['hair','eyebrow','esthetic','fashion'],
    w03: ['consulting','photo','marriage','gym'],
    w04: ['fashion','makeup','photo','consulting'],
    w05: ['diagnosis','fashion','hair','makeup'],
    w06: ['fashion','makeup','hair','photo'],
    w07: ['photo','makeup','fashion','hair'],
    w08: ['eyebrow','whitening','orthodontics','hairremoval']
  };
  const baseList = TYPE_BASE[typeId] || [];
  const baseBoost = (cat)=>{ const idx = baseList.indexOf(cat); if(idx===0) return 60; if(idx===1) return 40; if(idx===2) return 25; if(idx>=3) return 15; return 10; };
  const axes = (diag?.step2?.scores?.axes) || {};
  const AXIS_WEIGHTS = {
    natural: { hair:0.25, eyebrow:0.2, esthetic:0.2, fashion:0.15 },
    evidence: { diagnosis:0.35, orthodontics:0.25, whitening:0.25 },
    guidance: { consulting:0.35, marriage:0.25 },
    customization: { fashion:0.3, makeup:0.25, nail:0.2 },
    gentle: { esthetic:0.25, makeup:0.2, nail:0.2 }
  };
  const CATS_ALL = ['consulting','gym','makeup','hair','diagnosis','fashion','photo','marriage','eyebrow','hairremoval','esthetic','whitening','orthodontics','nail'];
  const scores = {};
  for(const c of CATS_ALL){ let s = baseBoost(c); for(const ax in AXIS_WEIGHTS){ const v = Number(axes[ax]||0); const w = AXIS_WEIGHTS[ax][c] || 0; s += v * w; } scores[c] = Math.max(0, Math.min(100, Math.round(s))); }
  const sorted = Object.keys(scores).sort((a,b)=> scores[b]-scores[a]);
  return { scores, sorted };
}
function jitterShuffle(arr){
  const a = arr.slice();
  // Stable day-based seed to keep same order within a day
  let seed = 0; try{ const d = new Date(); const y=d.getFullYear(); const m=d.getMonth()+1; const day=d.getDate(); seed = (y*10000 + m*100 + day) % 9973; }catch{ seed = (Date.now()%9973); }
  for(let i=a.length-1;i>0;i--){ const j = (seed + Math.floor(Math.random()*(i+1))) % (i+1); const tmp=a[i]; a[i]=a[j]; a[j]=tmp; }
  return a;
}
(async function init(){
  const host = $('#type-candidates-list'); if(!host) return;
  const loggedIn = isLoggedIn();
  const section = document.getElementById('type-candidates');
  if(!loggedIn){
    try{ if(section){ section.style.display = 'none'; } }catch{}
    return; // 未ログイン時は候補一覧セクション自体を非表示
  }
  const diag = loadDiagnosis();
  const [local, stat] = [loadLocalServices(), await loadStaticServices()];
  let all = [...local, ...stat]; if(all.length===0){ return; }
  // enrich provider/store if available (static providers only for storeName/address)
  try{
    const provStatic = await loadStaticProviders();
    const pmap = Object.fromEntries(provStatic.map(p=> [p.id, p]));
    all = all.map(s=>{
      const p = s.providerId ? pmap[s.providerId] : null;
      if(p && Array.isArray(p.stores)){
        const sid = String(s.storeId||'');
        const st = sid ? p.stores.find(x=> String(x.id||'')===sid) : (p.stores[0]||null);
        if(st){ s.storeName = st.storeName || s.storeName || ''; s.address = st.address || s.address || ''; }
      }
      if(p && p.name && !s.providerName){ s.providerName = p.name; }
      return s;
    });
  }catch{}
  const { scores: catScores, sorted: catSorted } = recommendCategories(diag||{});
  // Build simple compatibility score: type match via provider profile.whatTypes if present
  const localProvMap = buildProvMap();
  function compatScore(s){
    try{
      const p = s.providerId ? (localProvMap[s.providerId] || null) : null;
      const whatTypes = p && p.onboarding && p.onboarding.profile && Array.isArray(p.onboarding.profile.whatTypes) ? p.onboarding.profile.whatTypes : [];
      const typeId = String(diag?.intent?.type_id || diag?.step2?.classification?.type_id || '');
      let base = 0;
      if(typeId && whatTypes.includes(typeId)) base = 100; else if(whatTypes.length>0) base = 60; else base = 40;
      const catBoost = Math.max(0, (catScores[s.category]||0));
      return Math.round(base*0.6 + catBoost*0.4); // blend
    }catch{ return 0; }
  }
  // mark candidates with score, filter good affinity (>= 60)
  const scored = all.map(s=> ({ s, score: compatScore(s) }));
  const good = scored.filter(x=> x.score >= 60).sort((a,b)=> b.score - a.score).map(x=> x.s);
  // fallback: if no diagnosis or few good matches, use shuffled all
  const pool = (diag && good.length) ? good : jitterShuffle(all).slice(0, Math.min(16, all.length));
  const shuffled = jitterShuffle(pool);
  const pick = shuffled.slice(0, Math.min(10, shuffled.length));
  const cards = pick.map(toCardSnapshot);
  await renderCards(cards);
  // update labels according to diagnosis presence (logged-in only)
  try{
    const personalize = !!diag;
    const title = document.getElementById('type-candidates-title');
    const lead = document.getElementById('type-candidates-lead');
    if(title){ title.textContent = personalize ? 'あなたに近い候補' : '候補一覧'; }
    if(lead){ lead.style.display = personalize ? '' : 'none'; }
    host.setAttribute('aria-label', personalize ? 'あなたに近い候補' : '候補一覧');
  }catch{}
  // Dim partially visible cards at both edges (same UX as おすすめサービス)
  const updateDim = () => {
    try{
      const rect = host.getBoundingClientRect();
      const leftEdge = rect.left + 1; // slight inset to avoid subpixel flicker
      const rightEdge = rect.right - 1;
      const els = host.querySelectorAll('.card');
      for(const el of els){
        const r = el.getBoundingClientRect();
        const fullyVisible = r.left >= leftEdge && r.right <= rightEdge;
        el.classList.toggle('is-dimmed', !fullyVisible);
      }
    }catch{}
  };
  updateDim();
  host.addEventListener('scroll', ()=> { window.requestAnimationFrame(updateDim); });
  window.addEventListener('resize', updateDim);

  // Constrain card height to section available space (PC only)
  function applyViewportHeightConstraint(){
    try{
      const isPC = window.innerWidth >= 1024;
      const section = document.getElementById('type-candidates');
      const title = document.getElementById('type-candidates-title');
      const lead = document.getElementById('type-candidates-lead');
      // 最下のCTA行（type-candidates 直下の最後の .cluster）を取得
      let ctaRow = null;
      try{ const clusters = section ? section.querySelectorAll('.cluster') : []; if(clusters && clusters.length>=1){ ctaRow = clusters[clusters.length-1]; } }catch{}
      if(isPC){
        const secRect = section ? section.getBoundingClientRect() : { height: 0 };
        const otherH = ((title?.offsetHeight)||0) + ((lead?.offsetHeight)||0) + ((ctaRow?.offsetHeight)||0) + 24;
        const baseList = Math.max(280, Math.round(secRect.height - otherH));
        const availList = baseList * 2; // セクション余白は広めのまま
        const cardH = Math.min(availList, 420); // カード自体は短くする（上限 420px）
        const imgH = Math.round(cardH * 0.48); // 画像に約半分を割当
        // 変数反映（リスト高さもカード高さに合わせて無駄な余白を抑える）
        host.style.setProperty('--cand-list-h', `${cardH}px`);
        host.style.setProperty('--card-h', `${cardH}px`);
        host.style.setProperty('--cand-img-h', `${imgH}px`);
      }else{
        // Remove constraints on mobile/tablet
        host.style.removeProperty('--cand-list-h');
        host.style.removeProperty('--card-h');
        host.style.removeProperty('--cand-img-h');
      }
    }catch{}
  }
  applyViewportHeightConstraint();
  window.addEventListener('resize', ()=> { applyViewportHeightConstraint(); });
  // Resume pending favorite after login if flagged
  try{
    const params = new URL(location.href).searchParams;
    const resume = params.get('resumeFav') === '1';
    const authMod = await import('./user-auth.js').catch(()=>null);
    const sess = authMod && typeof authMod.getUserSession === 'function' ? authMod.getUserSession() : null;
    if(resume && sess){
      const raw = sessionStorage.getItem('fineme:pending-favorite');
      if(raw){
        const snap = JSON.parse(raw);
        try{ const favMod = await import('./favorites.js'); favMod.addFavorite(snap); }catch{}
        try{ sessionStorage.removeItem('fineme:pending-favorite'); }catch{}
      }
    }
  }catch{}
})();
