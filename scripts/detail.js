// @ts-nocheck
const SERVICES_KEY = 'glowup:services';
const PROVIDERS_KEY = 'glowup:providers';
import { loadOptions } from './options.js';
function resolvePrefix(){ return location.pathname.includes('/pages/') ? '..' : '.'; }
// compute correct relative path to store.html depending on current page location
function storeBase(){
  try{
    if(location.pathname && location.pathname.indexOf('/pages/') !== -1) return './store.html';
    return './pages/store.html';
  }catch{ return './pages/store.html'; }
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
function categoryPhotoFor(category){
  const map = {
    consulting: 'https://images.unsplash.com/photo-1529336953121-ad5a0d43d0d2?q=80&w=1400&auto=format&fit=crop',
    gym: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1400&auto=format&fit=crop',
    makeup: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1400&auto=format&fit=crop',
    hair: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1400&auto=format&fit=crop',
    diagnosis: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1400&auto=format&fit=crop',
    fashion: 'https://images.unsplash.com/photo-1520975657288-4e3b66f3c54a?q=80&w=1400&auto=format&fit=crop',
    photo: 'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?q=80&w=1400&auto=format&fit=crop',
    marriage: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1400&auto=format&fit=crop'
  };
  return map[category] || '';
}
function loadProviders(){
  try{
    const raw = localStorage.getItem(PROVIDERS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
async function loadStaticProviders(){
  const rel = `${resolvePrefix()}/scripts/data/providers.json`;
  try{
    const res = await fetch(rel, { cache:'no-store' });
    if(!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }catch(e){
    try{
      const res2 = await fetch('/scripts/data/providers.json', { cache:'no-store' });
      if(!res2.ok) throw new Error(String(res2.status));
      const data2 = await res2.json();
      return Array.isArray(data2) ? data2 : [];
    }catch(e2){ return []; }
  }
}
async function loadStaticServices(){
  const rel = `${resolvePrefix()}/scripts/data/services.json`;
  try{
    const res = await fetch(rel, { cache:'no-store' });
    if(!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }catch(e){
    try{
      const res2 = await fetch('/scripts/data/services.json', { cache:'no-store' });
      if(!res2.ok) throw new Error(String(res2.status));
      const data2 = await res2.json();
      return Array.isArray(data2) ? data2 : [];
    }catch(e2){ return []; }
  }
}
function qs(s,el=document){return el.querySelector(s);} 
function params(){return Object.fromEntries(new URL(location.href).searchParams.entries());}
function loadLocalServices(){
  try{
    const raw = localStorage.getItem(SERVICES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
(async function init(){
  const { slug='', localId='' } = params();
  const root = qs('#detail');
  let svc = null;
  let providerName = '';
  let providerId = '';
  // contact/info fields (declare to avoid ReferenceError in module/strict mode)
  let providerAddress = '';
  let providerPhone = '';
  let providerBusinessHours = '';
  let providerWebsite = '';
  if(localId){
    const arr = loadLocalServices();
    svc = arr.find(s=> s.id === localId) || null;
  if(svc){
      // normalize fields used below
      svc.image = svc.photo || '';
      svc.priceFrom = Number((svc.price!=null?svc.price:svc.priceMin)||0);
      // compatibility: map staffIds/staffNames -> staff (string) for display
      if(!svc.staff){
        if(Array.isArray(svc.staffNames) && svc.staffNames.length){
          svc.staff = svc.staffNames.join('、');
        } else if(svc.staffName){
          svc.staff = svc.staffName;
        }
      }
      // resolve provider display
      if(svc.providerId){
        let provs = loadProviders();
        let p = provs.find(x=> x.id === svc.providerId);
        if(!p){
          // fallback to static
          const stat = await loadStaticProviders();
          p = stat.find(x=> x.id === svc.providerId) || null;
        }
        if(p){
          providerName = (p.profile && p.profile.storeName) || p.name || '';
          providerId = p.id;
          // expose basic provider-level fields for display
          providerAddress = (p.profile && p.profile.address) || '';
          providerPhone = (p.profile && p.profile.phone) || '';
          providerBusinessHours = (p.profile && p.profile.businessHours) || '';
          providerWebsite = (p.profile && p.profile.website) || '';
          // if access stored as object, convert to human readable
          if(p.profile && p.profile.access){
            if(typeof p.profile.access === 'object'){
              const a = p.profile.access;
              providerAddress = providerAddress; // keep
              // append access info into website/phone block via providerBusinessHours variable if needed
            }
          }
          // try resolve store name if service has storeId
          if(svc && svc.storeId){
            const stores = Array.isArray(p.stores) ? p.stores : (p.profile ? [ { id: '', storeName: p.profile.storeName||'' } ] : []);
            const st = stores.find(x=> String(x.id||'') === String(svc.storeId||''));
            if(st && st.storeName) providerName = st.storeName;
          }
        }
      }
    }
  } else if(slug){
    const stat = await loadStaticServices();
    svc = stat.find(s=>s.slug===slug) || null;
  }

  if(!svc){ const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'サービスが見つかりませんでした。'; root.appendChild(p); return; }
  const placeholder = placeholderFor(svc.category);
  // build access/map link
  const mapLink = providerAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(providerAddress)}` : '';
  const imgSrc = (svc.image && svc.image.trim()) ? svc.image : (categoryPhotoFor(svc.category) || placeholder);
  // sanitize external links and prepare safe gallery values
  const safeMap = (typeof safeUrl === 'function') ? (safeUrl(mapLink) || '') : mapLink || '';
  const safeSite = (typeof safeUrl === 'function') ? (safeUrl(providerWebsite) || '') : (providerWebsite || '');
  // inject minimal styles for gallery and access block (idempotent)
  (function ensureDetailStyles(){
    if(document.getElementById('fineme-detail-styles')) return;
    const css = `
      :root{ --detail-bg:#f6f7f8; }
      .detail-hero{ display:block; width:100%; max-width:960px; margin:0 auto 18px auto; }
      .detail-hero img{ width:100%; height:auto; border-radius:8px; display:block; }
      .detail-gallery{ display:flex; gap:8px; overflow-x:auto; padding:6px 0; }
      .detail-thumb{ flex:0 0 auto; width:220px; height:140px; object-fit:cover; border-radius:8px; cursor:pointer; border:1px solid rgba(0,0,0,0.06); }
      .detail-access{ background:linear-gradient(90deg, rgba(14,55,96,0.02), rgba(14,55,96,0.01)); padding:12px; border-radius:8px; margin:8px 0; }
      .detail-access p{ margin:4px 0; }
      .gallery-overlay{ position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0.75); z-index:1200; }
      .gallery-overlay img{ max-width:94%; max-height:86%; border-radius:8px; box-shadow:0 8px 32px rgba(0,0,0,0.6); }
      .gallery-overlay .close{ position:absolute; top:18px; right:20px; background:transparent; color:#fff; border:none; font-size:28px; cursor:pointer; }

      /* Section styling: card-like blocks for clarity */
      .detail-section{ background:#fff; padding:16px; border-radius:8px; box-shadow:0 4px 12px rgba(20,30,40,0.04); margin:18px 0; border:1px solid rgba(0,0,0,0.04); }
      .detail-section h3, .detail-section h4{ margin:0 0 8px 0; font-size:16px; }
      .detail-container{ display:block; max-width:960px; margin:0 auto; padding:8px; }
      .svc-options-block > div{ background:transparent; padding:8px 0; }
      .svc-options-block label{ display:block; padding:8px 0; border-bottom:1px dashed rgba(0,0,0,0.03); }
      .svc-options-block label:last-child{ border-bottom:none; }
      .svc-options-block input[type="checkbox"]{ margin-top:6px; margin-right:10px; }
      .svc-options-block .name{ font-weight:700; margin-bottom:4px; }
      .svc-options-block .meta{ color:var(--muted); font-size:13px }
      .btn--primary{ background:linear-gradient(90deg,var(--primary), #0e3760); color:#fff; border:none; padding:10px 14px; border-radius:6px; box-shadow:var(--shadow-sm); }
      @media(max-width:720px){ .detail-section{ padding:12px; } .detail-thumb{ width:140px;height:90px } }
    `;
    const s = document.createElement('style');
    s.id = 'fineme-detail-styles';
    s.appendChild(document.createTextNode(css));
    document.head.appendChild(s);
  })();
  // build DOM safely instead of using innerHTML templates
  const serviceKey = localId ? `local:${localId}` : (slug ? `slug:${slug}` : '');
  // header + hero
  const stack = document.createElement('div'); stack.className = 'stack';
  const h1 = document.createElement('h1'); h1.textContent = svc.name || ''; stack.appendChild(h1);
  const heroImg = document.createElement('img'); heroImg.className = 'service-thumb'; heroImg.src = (typeof safeUrl === 'function' ? (safeUrl(imgSrc) || placeholder) : imgSrc); heroImg.alt = svc.name || '';
  heroImg.addEventListener('error', ()=>{ try{ heroImg.onerror = null; heroImg.src = placeholder; }catch{} });
  stack.appendChild(heroImg);
  if(providerId && providerName){ const p = document.createElement('p'); p.className = 'card-meta'; const a = document.createElement('a'); a.href = `${storeBase()}?providerId=${encodeURIComponent(providerId)}`; a.textContent = providerName; p.appendChild(document.createTextNode('店舗: ')); p.appendChild(a); stack.appendChild(p); }
  // Guard: hide reservation CTA if provider onboarding not completed
  let providerIsPublic = true;
  try{
    const PROVIDERS_KEY = 'glowup:providers';
    const raw = localStorage.getItem(PROVIDERS_KEY); const arr = raw? JSON.parse(raw):[]; const prov = Array.isArray(arr)? arr.find(p=> p.id===providerId): null;
    providerIsPublic = !!(prov && prov.onboarding && prov.onboarding.completed);
  }catch(_){ providerIsPublic = true; }
  // provider access block
  if(providerAddress || providerPhone || providerBusinessHours || safeSite){
    const da = document.createElement('div'); da.className = 'detail-access';
    if(providerAddress){ const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = '住所'; p.appendChild(strong); p.appendChild(document.createTextNode('： ' + String(providerAddress))); if(safeMap){ const a = document.createElement('a'); a.href = safeMap; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '地図を開く'; p.appendChild(document.createTextNode(' ')); p.appendChild(a); } da.appendChild(p); }
    if(providerPhone){ const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = '電話'; p.appendChild(strong); const a = document.createElement('a'); a.href = `tel:${encodeURIComponent(providerPhone)}`; a.textContent = String(providerPhone); p.appendChild(document.createTextNode('： ')); p.appendChild(a); da.appendChild(p); }
    if(providerBusinessHours){ const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = '営業時間'; p.appendChild(strong); p.appendChild(document.createTextNode('： ' + String(providerBusinessHours))); da.appendChild(p); }
    if(safeSite){ const p = document.createElement('p'); const strong = document.createElement('strong'); strong.textContent = 'Web'; const a = document.createElement('a'); a.href = safeSite; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '店舗サイト'; p.appendChild(strong); p.appendChild(document.createTextNode('： ')); p.appendChild(a); da.appendChild(p); }
    stack.appendChild(da);
  }
  const metaP = document.createElement('p'); metaP.className = 'card-meta'; metaP.textContent = `地域: ${svc.region || ''} / カテゴリ: ${svc.category || ''} / 価格: ¥${Number(svc.priceFrom||0).toLocaleString()}`; stack.appendChild(metaP);
  if(svc.catchcopy){ const p = document.createElement('p'); p.className = 'muted'; p.textContent = svc.catchcopy; stack.appendChild(p); }
  // gallery
  if(Array.isArray(svc.gallery) && svc.gallery.length){ const gwrap = document.createElement('div'); gwrap.className = 'stack'; const h3 = document.createElement('h3'); h3.style.margin = '0'; h3.textContent = 'ギャラリー'; gwrap.appendChild(h3); const galleryDiv = document.createElement('div'); galleryDiv.className = 'detail-gallery'; galleryDiv.setAttribute('role','list'); for(const u of svc.gallery){ try{ const src = (typeof safeUrl === 'function' ? (safeUrl(u) || placeholder) : (u || placeholder)); const im = document.createElement('img'); im.className = 'detail-thumb'; im.setAttribute('role','listitem'); im.src = src; im.setAttribute('data-full', src); im.alt = svc.name || ''; im.addEventListener('error', ()=>{ try{ im.onerror=null; im.src = placeholder; }catch{} }); galleryDiv.appendChild(im); }catch{} } gwrap.appendChild(galleryDiv); stack.appendChild(gwrap); }
  // description with line breaks
  if(svc.description){ const p = document.createElement('p'); p.id = 'svc-description'; const parts = String(svc.description).split('\n'); parts.forEach((line, idx)=>{ p.appendChild(document.createTextNode(line)); if(idx < parts.length-1) p.appendChild(document.createElement('br')); }); stack.appendChild(p); }
  if(svc.staff){ const p = document.createElement('p'); p.textContent = `担当者: ${svc.staff}`; stack.appendChild(p); }
  if(svc.id){
    if(providerIsPublic){ const a = document.createElement('a'); a.id = 'detail-reserve-btn'; a.className = 'btn btn--primary btn--inverted'; a.href = `/pages/user/schedule.html?serviceId=${svc.id}&origin=detail`; a.textContent = '予約へ進む'; stack.appendChild(a); }
    else { const warn = document.createElement('div'); warn.className='card'; warn.style.padding='12px'; const strong=document.createElement('strong'); strong.textContent='この店舗は準備中です（非公開）'; warn.appendChild(strong); const p=document.createElement('p'); p.className='muted'; p.textContent='オンボーディング未完了のため予約できません。'; warn.appendChild(p); stack.appendChild(warn); }
  }
  // Compatibility block (診断ベース相性表示)
  try{
    if(providerId){
      const matchMod = await import('./matching.js');
      const m = await matchMod.computeMatchForProvider(providerId);
      if(m){
        const card = document.createElement('div'); card.className='card'; card.style.padding='12px'; card.style.marginTop='10px';
        const title = document.createElement('div'); title.className='cluster'; title.style.justifyContent='space-between'; title.style.alignItems='center';
        const strong = document.createElement('strong'); strong.textContent = 'あなたとの相性'; title.appendChild(strong);
        // ゾーン文言（A–D＋Eの距離から近似）
        try{
          const raw = localStorage.getItem('fineme:diagnosis:latest');
          const diag = raw ? JSON.parse(raw) : null;
          const matchMod = await import('./matching.js');
          const user = matchMod.getUserAxesFromDiagnosis(diag);
          // providerIdから店舗取得（静的/ローカル）
          const provRaw = localStorage.getItem('glowup:providers');
          const arr = provRaw ? JSON.parse(provRaw) : [];
          const provider = Array.isArray(arr) ? arr.find(p=> p.id===providerId) : null;
          const shop = provider ? matchMod.getShopScoresFromProvider(provider) : { A:2,B:2,C:2,D:2,E_tags:[] };
          const comp = matchMod.computeCompatibilityAxes(user, shop);
          const zoneLabel = (function(adj){
            if(adj <= 2.0) return 'とても相性がいい';
            if(adj <= 3.0) return '相性がいい';
            if(adj <= 4.0) return '合いそう';
            return '選択肢として表示';
          })(Number(comp.adjusted||999));
          const badge = document.createElement('span'); badge.className='badge'; badge.textContent = zoneLabel; title.appendChild(badge);
        }catch{}
        card.appendChild(title);
        if(Array.isArray(m.reasons) && m.reasons.length){ const ul=document.createElement('ul'); ul.style.margin='8px 0 0'; ul.style.padding='0 0 0 18px'; for(const r of m.reasons.slice(0,3)){ const li=document.createElement('li'); li.textContent=String(r); ul.appendChild(li); } card.appendChild(ul); }
        const ctaWrap = document.createElement('div'); ctaWrap.className='cluster'; ctaWrap.style.justifyContent='flex-end'; ctaWrap.style.marginTop='10px';
        const a2 = document.createElement('a'); a2.className='btn btn--primary'; a2.href = `/pages/user/schedule.html?serviceId=${svc.id}&origin=detail`; a2.textContent = '予約へ進む'; ctaWrap.appendChild(a2);
        card.appendChild(ctaWrap);
        stack.appendChild(card);
      }
    }
  }catch(e){ /* optional */ }
  stack.appendChild(document.createElement('hr'));
  // reviews section
  const reviewsSection = document.createElement('section'); reviewsSection.id = 'reviews'; reviewsSection.className = 'stack';
  // rating summary (may be filled via reviews.js)
  const ratingCluster = document.createElement('div'); ratingCluster.className = 'cluster'; ratingCluster.style.gap = '8px'; ratingCluster.style.alignItems = 'center'; const strongEl = document.createElement('strong'); strongEl.textContent = 'レビュー'; ratingCluster.appendChild(strongEl); const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = '' ; ratingCluster.appendChild(badge); reviewsSection.appendChild(ratingCluster);
  const reviewListDiv = document.createElement('div'); reviewListDiv.id = 'review-list'; reviewListDiv.className = 'stack'; reviewsSection.appendChild(reviewListDiv);
  const infoCard = document.createElement('div'); infoCard.className = 'card'; infoCard.style.padding = '12px';
  const infoP = document.createElement('p'); infoP.className = 'muted'; infoP.style.margin = '0';
  // safe: build lines with textContent and <br>
  infoP.appendChild(document.createTextNode('レビューの投稿は「マイページ › 予約履歴」から行えます。'));
  infoP.appendChild(document.createElement('br'));
  infoP.appendChild(document.createTextNode('予約したサービスで、予約日時を過ぎたもののみ投稿可能です。'));
  const infoA = document.createElement('a'); infoA.className = 'btn btn-ghost'; infoA.href = '/pages/mypage/reservations.html'; infoA.style.marginLeft = '8px'; infoA.textContent = '予約履歴を開く'; infoP.appendChild(infoA); infoCard.appendChild(infoP); reviewsSection.appendChild(infoCard);
  stack.appendChild(reviewsSection);
  // attach built stack
  root.appendChild(stack);

  // render options (if any) and wire reservation link
  try{
    const allOpts = loadOptions();
    const svcOptIds = Array.isArray(svc.optionIds) ? svc.optionIds : [];
    const svcOpts = svcOptIds.map(id => allOpts.find(o=> String(o.id) === String(id))).filter(Boolean);
    if(svcOpts.length){
      const reserveBtn = document.getElementById('detail-reserve-btn');
      const optsWrap = document.createElement('div');
      optsWrap.style.marginTop = '12px';
      const sectionEl = document.createElement('section'); sectionEl.className = 'detail-section'; sectionEl.setAttribute('aria-labelledby','opts-title'); const h3 = document.createElement('h3'); h3.id = 'opts-title'; h3.style.margin = '8px 0 4px'; h3.textContent = 'オプション'; sectionEl.appendChild(h3);
      for(const o of svcOpts){
        const label = document.createElement('label'); label.className = 'svc-option-card'; label.style.display='flex'; label.style.gap='12px'; label.style.alignItems='flex-start'; label.style.padding='10px'; label.style.borderRadius='8px';
        const input = document.createElement('input'); input.type='checkbox'; input.className='detail-option-checkbox'; input.value = o.id;
        const right = document.createElement('div'); right.style.flex='1';
        const header = document.createElement('div'); header.style.display='flex'; header.style.justifyContent='space-between'; header.style.alignItems='center'; header.style.gap='12px';
        const nameDiv = document.createElement('div'); nameDiv.style.fontWeight='700'; nameDiv.textContent = String(o.name||'');
        const priceDiv = document.createElement('div'); priceDiv.style.fontWeight='700'; priceDiv.style.color='var(--primary)'; priceDiv.textContent = o.price? '¥'+Number(o.price).toLocaleString() : '';
        header.appendChild(nameDiv); header.appendChild(priceDiv);
        const descDiv = document.createElement('div'); descDiv.style.color='var(--muted)'; descDiv.style.fontSize='13px'; descDiv.style.marginTop='6px'; descDiv.textContent = o.description? String(o.description) : '';
        right.appendChild(header); right.appendChild(descDiv);
        label.appendChild(input); label.appendChild(right); sectionEl.appendChild(label);
      }
      optsWrap.appendChild(sectionEl);
      // prefer inserting the options block after the service description
      const descEl = root.querySelector('#svc-description');
      if(descEl && descEl.parentNode){
        optsWrap.style.maxWidth = 'min(640px,100%)';
        descEl.insertAdjacentElement('afterend', optsWrap);
      } else {
        // fallback: insert after the photo, or before hr or at end
        const imgEl = root.querySelector('img.service-thumb') || root.querySelector('img');
        if(imgEl && imgEl.parentNode){
          optsWrap.style.maxWidth = 'min(640px,100%)';
          imgEl.insertAdjacentElement('afterend', optsWrap);
        } else {
          const hrEl = root.querySelector('hr');
          if(hrEl) hrEl.parentNode.insertBefore(optsWrap, hrEl);
          else root.appendChild(optsWrap);
        }
      }

      function updateReserve(){
        if(!reserveBtn) return;
        const selected = Array.from(optsWrap.querySelectorAll('.detail-option-checkbox:checked')).map(i=> i.value).join(',');
        try{
          const u = new URL(reserveBtn.getAttribute('href'), location.href);
          if(selected) u.searchParams.set('optionIds', selected); else u.searchParams.delete('optionIds');
          reserveBtn.setAttribute('href', u.pathname + u.search);
        }catch(e){}
      }
      optsWrap.addEventListener('change', updateReserve);
      updateReserve();
    }
  }catch(e){ /* ignore */ }

    // Force inline styles on the inverted reservation button to ensure it wins
    // against any stubborn CSS rules (uses setProperty with 'important').
    try{
      const invBtn = root.querySelector('a.btn--inverted, button.btn--inverted');
      if(invBtn){
        // reservation button: primary gradient background + white text
        invBtn.style.setProperty('background', 'linear-gradient(90deg,var(--primary), #0e3760)', 'important');
        invBtn.style.setProperty('color', '#fff', 'important');
        invBtn.style.setProperty('border', 'none', 'important');
        invBtn.style.setProperty('box-shadow', 'var(--shadow-sm)', 'important');
      }
      // reservation history (ghost) should be neutral: white bg + primary text
      const ghost = root.querySelector('a.btn-ghost, button.btn-ghost');
      if(ghost){
        // Make reservation history match the reservation button: primary gradient + white text
        ghost.style.setProperty('background', 'linear-gradient(90deg,var(--primary), #0e3760)', 'important');
        ghost.style.setProperty('color', '#fff', 'important');
        ghost.style.setProperty('border', 'none', 'important');
        ghost.style.setProperty('box-shadow', 'var(--shadow-sm)', 'important');
      }
    }catch(e){ /* ignore */ }

    // Gallery lightbox: create overlay and wire thumbnails
    try{
      if(Array.isArray(svc.gallery) && svc.gallery.length){
        let overlay = document.getElementById('gallery-overlay');
        if(!overlay){
          overlay = document.createElement('div');
          overlay.id = 'gallery-overlay';
          overlay.className = 'gallery-overlay';
            const closeBtn = document.createElement('button'); closeBtn.className = 'close'; closeBtn.setAttribute('aria-label','閉じる'); closeBtn.textContent = '×';
            const overlayImg = document.createElement('img'); overlayImg.src = ''; overlayImg.alt = 'ギャラリー画像';
            overlay.appendChild(closeBtn); overlay.appendChild(overlayImg);
          document.body.appendChild(overlay);
        }
  const infoCard = document.createElement('div'); infoCard.className = 'card'; infoCard.style.padding = '12px'; const infoP = document.createElement('p'); infoP.className = 'muted'; infoP.style.margin = '0'; infoP.appendChild(document.createTextNode('レビューの投稿は「マイページ › 予約履歴」から行えます。')); infoP.appendChild(document.createElement('br')); infoP.appendChild(document.createTextNode('予約したサービスで、予約日時を過ぎたもののみ投稿可能です。')); const infoA = document.createElement('a'); infoA.className = 'btn btn-ghost'; infoA.href = '/pages/mypage/reservations.html'; infoA.style.marginLeft = '8px'; infoA.textContent = '予約履歴を開く'; infoP.appendChild(infoA); infoCard.appendChild(infoP); reviewsSection.appendChild(infoCard);
        const thumbs = root.querySelectorAll('.detail-thumb');
        thumbs.forEach(t => t.addEventListener('click', (ev)=>{
          const src = t.getAttribute('data-full') || t.src;
          const img = overlay.querySelector('img');
          img.src = src;
          overlay.style.display = 'flex';
        }));
        overlay.addEventListener('click', (ev)=>{
          if(ev.target === overlay || ev.target.classList.contains('close')){
            overlay.style.display = 'none';
          }
        });
      }
    }catch(e){ console.debug('gallery init failed', e); }

  // レンダリングとイベント
  try{
    // 閲覧履歴に追加（非同期importで遅延）
    try{
      const modH = await import('./history.js');
      const href = location.pathname + location.search;
      const snap = { href, name: svc.name, region: svc.region, category: svc.category, priceFrom: svc.priceFrom, image: imgSrc, providerName, providerId };
      modH.addHistory(snap);
    }catch{}

    const { getReviewsFor, addReview, flagReview, ratingSummary } = await import('./reviews.js');
    const listHost = document.getElementById('review-list');
  const form = document.getElementById('review-form');
    function escape(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function star(n){ return '★'.repeat(n) + '☆'.repeat(5-n); }
    function renderList(){
      let arr = getReviewsFor(serviceKey);
      // Ensure provider-hidden reviews are not shown (visible === false)
      const before = arr.length;
      arr = arr.filter(r => r && r.visible !== false);
      const hidden = before - arr.length;
      if(hidden > 0) console.debug(`detail: excluded ${hidden} hidden reviews for ${serviceKey}`);
      listHost.textContent = '';
      if(!arr.length){ const p = document.createElement('p'); p.className='muted'; p.textContent='まだレビューはありません。'; listHost.appendChild(p); return; }
      const frag = document.createDocumentFragment();
      for(const r of arr.sort((a,b)=> new Date(b.createdAt||0)-new Date(a.createdAt||0))){
        const item = document.createElement('div');
        item.className = 'card';
        item.style.padding = '12px';
        // header cluster
        const headerCluster = document.createElement('div'); headerCluster.className = 'cluster'; headerCluster.style.justifyContent = 'space-between'; headerCluster.style.alignItems = 'center'; headerCluster.style.gap = '8px';
        const left = document.createElement('div'); const strongUser = document.createElement('strong'); strongUser.textContent = r.userName||'ユーザー'; left.appendChild(strongUser); const dateSpan = document.createElement('span'); dateSpan.className = 'muted'; dateSpan.style.fontSize = '12px'; dateSpan.textContent = new Date(r.createdAt).toLocaleDateString(); left.appendChild(document.createTextNode(' ')); left.appendChild(dateSpan);
        const ratingDiv = document.createElement('div'); ratingDiv.setAttribute('aria-label','評価'); ratingDiv.textContent = star(Number(r.rating)||0);
        headerCluster.appendChild(left); headerCluster.appendChild(ratingDiv); item.appendChild(headerCluster);
  if(r.comment){
        const p = document.createElement('p');
        p.style.margin = '8px 0 0';
        try{
          if(typeof sanitizeHtml === 'function'){
            // trusted sanitizer available: insert sanitized HTML
            p.innerHTML = sanitizeHtml(String(r.comment||''));
          } else {
            // no sanitizer: render text safely while preserving line breaks
            const parts = String(r.comment||'').split('\n');
            parts.forEach((line, idx)=>{
              p.appendChild(document.createTextNode(line));
              if(idx < parts.length-1) p.appendChild(document.createElement('br'));
            });
          }
        }catch(e){
          // final fallback: plain text
          p.textContent = String(r.comment||'');
        }
        item.appendChild(p);
      }
        const actionCluster = document.createElement('div'); actionCluster.className = 'cluster'; actionCluster.style.justifyContent = 'flex-end'; actionCluster.style.gap = '8px'; actionCluster.style.marginTop = '8px'; const flagBtn = document.createElement('button'); flagBtn.type = 'button'; flagBtn.className = 'btn btn-ghost btn-flag'; flagBtn.setAttribute('data-id', r.id); flagBtn.textContent = '通報'; actionCluster.appendChild(flagBtn); item.appendChild(actionCluster);
        frag.appendChild(item);
      }
      listHost.appendChild(frag);
    }
    renderList();
    // 投稿はマイページの予約履歴からのみ。通報ボタンのみ有効。
    // Sync across tabs: re-render when reviews storage changes (e.g., provider hid a review)
    window.addEventListener('storage', (ev)=>{
      try{
        if(ev.key === 'glowup:reviews'){
          renderList();
        }
      }catch{}
    });
    document.addEventListener('click', (e)=>{
      const t = e.target;
      if(t && t.classList && t.classList.contains('btn-flag')){
        const id = t.getAttribute('data-id');
        const reason = window.prompt('通報理由を入力してください（任意）','');
        flagReview(id, reason||'');
        renderList();
      }
    });
  }catch{}
})();
