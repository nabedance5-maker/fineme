// Provider-side profile editor: reads/writes to localStorage providers
// @ts-nocheck
export {};
// local binding to global safeUrl if provided by helper script
const safeUrl = (typeof globalThis !== 'undefined' && typeof globalThis.safeUrl === 'function') ? globalThis.safeUrl : null;
const PROVIDERS_KEY = 'glowup:providers';
const SESSION_KEY = 'glowup:providerSession';

function $(s, root=document){ return root.querySelector(s); }
function loadProviders(){ try{ const raw = localStorage.getItem(PROVIDERS_KEY); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr:[]; }catch{ return []; } }
function saveProviders(list){ localStorage.setItem(PROVIDERS_KEY, JSON.stringify(list)); }
function getSession(){ try{ const raw = sessionStorage.getItem(SESSION_KEY); return raw? JSON.parse(raw):null; }catch{ return null; } }

function loadToForm(){
  const session = getSession();
  if(!session) return;
  const list = loadProviders();
  const p = list.find(x=> x.id === session.id);
  if(!p) return;
  $('#profile-name').value = p.name || '';
  // Backward compatibility: if profile is empty but stores exist, migrate first store to profile
  if((!p.profile || !p.profile.storeName) && Array.isArray(p.stores) && p.stores.length){
    const s = p.stores[0];
    p.profile = p.profile || {};
    p.profile.storeName = p.profile.storeName || s.storeName || '';
    p.profile.address = p.profile.address || s.address || '';
    p.profile.businessHours = p.profile.businessHours || s.businessHours || '';
    p.profile.phone = p.profile.phone || s.phone || '';
    p.profile.website = p.profile.website || s.website || '';
    saveProviders(list);
  }
  // Load provider-level single store fields from profile (one-provider == one-store)
  $('#profile-storeName').value = p.profile?.storeName || '';
  $('#profile-phone').value = p.profile?.phone || '';
  $('#profile-address').value = p.profile?.address || '';
  // new fields
  if($('#profile-postal')) $('#profile-postal').value = p.profile?.postal || '';
  if($('#profile-priceFrom')) $('#profile-priceFrom').value = p.profile?.priceFrom || '';
  if($('#profile-access-station')) $('#profile-access-station').value = p.profile?.access?.station || p.profile?.accessStation || '';
  if($('#profile-access-exit')) $('#profile-access-exit').value = p.profile?.access?.exit || '';
  if($('#profile-access-walk')) $('#profile-access-walk').value = p.profile?.access?.walk || '';
  // load payment methods
  if(Array.isArray(p.profile?.paymentMethods) && p.profile.paymentMethods.length){
    const pmHost = document.getElementById('profile-payment-methods');
    if(pmHost){ Array.from(pmHost.querySelectorAll('input[type=checkbox]')).forEach(el=>{ if(el instanceof HTMLInputElement){ el.checked = p.profile.paymentMethods.includes(el.value); } }); }
  }
  // amenities: checkbox group
  if(Array.isArray(p.profile?.amenities) && p.profile.amenities.length){
    const host = document.getElementById('profile-amenities');
    if(host){ Array.from(host.querySelectorAll('input[type=checkbox]')).forEach(el=>{ if(el instanceof HTMLInputElement){ el.checked = p.profile.amenities.includes(el.value); } }); }
  }
  if($('#profile-businessHours')) $('#profile-businessHours').value = p.profile?.businessHours || '';
  // load structured business hours if present
  try{
    const bh = p.profile?.businessHoursStructured || null;
    const days = ['mon','tue','wed','thu','fri','sat','sun'];
    if(bh){
      days.forEach(d=>{
        const obj = bh[d] || {};
        const openEl = document.getElementById(`bh-${d}-open`);
        const closeEl = document.getElementById(`bh-${d}-close`);
        const closedEl = document.getElementById(`bh-${d}-closed`);
        if(openEl && openEl instanceof HTMLInputElement) openEl.value = obj.open || '';
        if(closeEl && closeEl instanceof HTMLInputElement) closeEl.value = obj.close || '';
        if(closedEl && closedEl instanceof HTMLInputElement) closedEl.checked = !!obj.closed;
      });
    }
  }catch(e){/* ignore */}
  $('#profile-website').value = p.profile?.website || '';
  $('#profile-description').value = p.profile?.description || '';
  // load new optional fields
  if($('#profile-coverSrcset')) $('#profile-coverSrcset').value = p.profile?.coverSrcset || '';
  if($('#profile-gallery')) $('#profile-gallery').value = Array.isArray(p.profile?.gallery) ? p.profile.gallery.join('\n') : '';
  // upload strategy (server | direct)
  if($('#profile-uploadStrategy')) $('#profile-uploadStrategy').value = p.profile?.uploadStrategy || 'server';
  // render previews for cover and gallery
  try{
    const coverPreview = document.getElementById('profile-coverPreview');
    if(coverPreview && coverPreview instanceof HTMLImageElement){
      const cs = p.profile?.coverSrcset || '';
      const firstUrl = (cs && cs.split(',').length) ? cs.split(',')[0].trim().split(' ')[0] : null;
    if(firstUrl){ try{ const s = (typeof safeUrl === 'function') ? (safeUrl(firstUrl) || '') : (firstUrl || ''); if(s){ coverPreview.src = s; coverPreview.style.display = 'block'; } else { coverPreview.style.display = 'none'; } }catch(e){ coverPreview.src = firstUrl; coverPreview.style.display = 'block'; } } else { coverPreview.style.display = 'none'; }
    }
  const items = Array.isArray(p.profile?.gallery) ? p.profile.gallery : [];
  try{ renderGalleryPreviewItems(items); }catch(e){}
  }catch(e){ /* ignore preview errors */ }
}

function onSubmit(e){
  e.preventDefault();
  const session = getSession();
  if(!session) return;
  const list = loadProviders();
  const idx = list.findIndex(x=> x.id === session.id);
  if(idx === -1) return;
  const fd = new FormData(e.currentTarget);
  list[idx].name = (fd.get('name')||'').toString().trim() || list[idx].name;
  // Save provider-level profile fields (single store)
  list[idx].profile = { ...(list[idx].profile||{}),
    storeName: (fd.get('storeName')||'').toString().trim(),
    phone: (fd.get('phone')||'').toString().trim(),
    address: (fd.get('address')||'').toString().trim(),
    postal: (fd.get('postal')||'').toString().trim(),
    priceFrom: (fd.get('priceFrom')||'').toString().trim(),
    access: {
      station: (fd.get('accessStation')||'').toString().trim(),
      exit: (fd.get('accessExit')||'').toString().trim(),
      walk: (fd.get('accessWalk')||'').toString().trim()
    },
  // collect structured business hours if provided
  businessHours: (function(){ try{ const days = ['mon','tue','wed','thu','fri','sat','sun']; const names = ['月','火','水','木','金','土','日']; const parts = []; const structured = {}; days.forEach((d,i)=>{ const openEl = document.getElementById(`bh-${d}-open`); const closeEl = document.getElementById(`bh-${d}-close`); const closedEl = document.getElementById(`bh-${d}-closed`); const open = (openEl && openEl instanceof HTMLInputElement) ? openEl.value : ''; const close = (closeEl && closeEl instanceof HTMLInputElement) ? closeEl.value : ''; const closed = (closedEl && closedEl instanceof HTMLInputElement) ? closedEl.checked : false; structured[d] = { open: open||'', close: close||'', closed: !!closed }; if(closed){ parts.push(`${names[i]}:定休日`); } else if(open && close){ parts.push(`${names[i]}:${open}〜${close}`); } else if(open && !close){ parts.push(`${names[i]}:${open}`); } }); const summary = parts.join(' / '); // e.g., 月:10:00〜19:00 / 火:定休日 / ...
    // attach the structured data to profile for richer rendering
    try{ list[idx].profile = list[idx].profile || {}; list[idx].profile.businessHoursStructured = structured; }catch(e){}
    return summary; }catch(e){ return (fd.get('businessHours')||'').toString().trim(); } })(),
  website: (fd.get('website')||'').toString().trim(),
  description: (fd.get('description')||'').toString(),
  // upload strategy preference
  uploadStrategy: (fd.get('uploadStrategy')||'server').toString(),
  // optional cover srcset and gallery (one URL per line)
  coverSrcset: (fd.get('coverSrcset')||'').toString().trim(),
  gallery: (function(){ try{ const raw = (fd.get('gallery')||'').toString().split(/\r?\n/).map(s=> s.trim()).filter(Boolean); return raw; }catch(e){ return []; } })(),
    // amenities: collect checkboxes inside #profile-amenities
    amenities: (function(){ const host = document.getElementById('profile-amenities'); if(!host) return []; return Array.from(host.querySelectorAll('input[type=checkbox]')).map(el=> el instanceof HTMLInputElement ? el : null).filter(Boolean).filter((c)=> c.checked).map(c=> c.value); })()
    ,
    // paymentMethods: collect checkboxes inside #profile-payment-methods
    paymentMethods: (function(){ const host = document.getElementById('profile-payment-methods'); if(!host) return []; return Array.from(host.querySelectorAll('input[type=checkbox]')).map(el=> el instanceof HTMLInputElement ? el : null).filter(Boolean).filter((c)=> c.checked).map(c=> c.value); })()
  };
  saveProviders(list);
  const msg = $('#provider-profile-message');
  if(msg){ msg.textContent = '保存しました。'; }
}

// Helpers used by provider profile page
function uuid(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8); return v.toString(16); }); }
function escapeHtml(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function renderProfileStores(stores){
  const host = document.getElementById('profile-stores'); if(!host) return; host.textContent = '';
  stores.forEach(st=>{
    const id = st.id || uuid();
    const row = document.createElement('div'); row.className = 'profile-store-row'; row.dataset.storeId = id;
    const card = document.createElement('div'); card.style.border = '1px solid var(--color-border)'; card.style.padding = '8px'; card.style.borderRadius = '8px'; card.style.marginBottom = '8px';
    const cluster = document.createElement('div'); cluster.className = 'cluster'; cluster.style.gap = '8px';
    const labelName = document.createElement('label'); labelName.style.flex = '1'; labelName.textContent = '店舗名'; const inputName = document.createElement('input'); inputName.name = 'storeName'; inputName.value = st.storeName || ''; labelName.appendChild(inputName);
    const labelPhone = document.createElement('label'); labelPhone.style.flex = '1'; labelPhone.textContent = '電話'; const inputPhone = document.createElement('input'); inputPhone.name = 'phone'; inputPhone.value = st.phone || ''; labelPhone.appendChild(inputPhone);
    cluster.appendChild(labelName); cluster.appendChild(labelPhone);
    card.appendChild(cluster);
    const labelAddr = document.createElement('label'); labelAddr.textContent = '住所'; const inputAddr = document.createElement('input'); inputAddr.name = 'address'; inputAddr.value = st.address || ''; labelAddr.appendChild(inputAddr); card.appendChild(labelAddr);
    const cluster2 = document.createElement('div'); cluster2.className = 'cluster'; cluster2.style.marginTop = '8px';
    const labelBh = document.createElement('label'); labelBh.style.flex = '1'; labelBh.textContent = '営業時間'; const inputBh = document.createElement('input'); inputBh.name = 'businessHours'; inputBh.value = st.businessHours || ''; labelBh.appendChild(inputBh);
    const labelWeb = document.createElement('label'); labelWeb.style.flex = '1'; labelWeb.textContent = 'Webサイト'; const inputWeb = document.createElement('input'); inputWeb.name = 'website'; inputWeb.value = st.website || ''; labelWeb.appendChild(inputWeb);
    cluster2.appendChild(labelBh); cluster2.appendChild(labelWeb); card.appendChild(cluster2);
    const footer = document.createElement('div'); footer.style.textAlign = 'right'; footer.style.marginTop = '6px'; const delBtn = document.createElement('button'); delBtn.type = 'button'; delBtn.className = 'btn btn-ghost profile-store-remove'; delBtn.textContent = '削除'; footer.appendChild(delBtn); card.appendChild(footer);
    row.appendChild(card); host.appendChild(row);
  });
  host.querySelectorAll('.profile-store-remove').forEach(btn=> btn.addEventListener('click', (e)=>{ const t = e.target; const r = (t instanceof Element) ? t.closest('.profile-store-row') : null; if(r && r instanceof Element) r.remove(); }));
}
function collectProfileStores(){ const host = document.getElementById('profile-stores'); if(!host) return []; const rows = Array.from(host.querySelectorAll('.profile-store-row')); return rows.map(r=>{ if(!(r instanceof Element)) return null; const hr = /** @type {HTMLElement} */ (r); const id = (hr.dataset && hr.dataset.storeId) ? hr.dataset.storeId : uuid(); const q = (sel)=>{ const el = r.querySelector(sel); return (el && el instanceof HTMLInputElement) ? (el.value||'') : ''; }; return { id, storeName: q('input[name="storeName"]').toString().trim(), phone: q('input[name="phone"]').toString().trim(), address: q('input[name="address"]').toString().trim(), businessHours: q('input[name="businessHours"]').toString().trim(), website: q('input[name="website"]').toString().trim() }; }).filter(Boolean).filter(s=> s.storeName || s.address || s.phone || s.website); }

function onReset(){
  loadToForm();
  const msg = $('#provider-profile-message');
  if(msg){ msg.textContent = ''; }
}

// Business hours: when a day's 'closed' checkbox is toggled, disable/enable the time inputs
function initBusinessHoursToggles(){
  try{
    const days = ['mon','tue','wed','thu','fri','sat','sun'];
    days.forEach(d=>{
      const chk = document.getElementById(`bh-${d}-closed`);
      const openEl = document.getElementById(`bh-${d}-open`);
      const closeEl = document.getElementById(`bh-${d}-close`);
      function apply(){
        try{
          const isClosed = chk && chk instanceof HTMLInputElement && chk.checked;
          if(openEl && openEl instanceof HTMLInputElement){ openEl.disabled = !!isClosed; openEl.style.opacity = isClosed ? '0.6' : '1'; }
          if(closeEl && closeEl instanceof HTMLInputElement){ closeEl.disabled = !!isClosed; closeEl.style.opacity = isClosed ? '0.6' : '1'; }
        }catch(e){}
      }
      if(chk && chk instanceof HTMLInputElement){ chk.addEventListener('change', apply); }
      // apply initial state
      apply();
    });
  }catch(e){ }
}

// Postal code lookup (ZipCloud API) - fills address when successful
async function lookupPostalCode(){
  try{
    const el = document.getElementById('profile-postal');
    const msg = document.getElementById('postal-lookup-msg');
    if(msg) msg.textContent = '';
    if(!el || !(el instanceof HTMLInputElement)) return;
    const raw = el.value || '';
    const code = raw.replace(/[^0-9]/g,'');
    if(!/^[0-9]{7}$/.test(code)){
      if(msg) msg.textContent = '郵便番号は7桁で入力してください（例:1500001）';
      return;
    }
    if(msg) msg.textContent = '検索中…';
    const url = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code}`;
    const res = await fetch(url);
    const j = await res.json();
    if(j && j.results && j.results.length){
      const r = j.results[0];
      // address1 都道府県, address2 市区町村, address3 町域
      const addr = `${r.address1 || ''}${r.address2 || ''}${r.address3 || ''}`;
      const addrEl = document.getElementById('profile-address');
      if(addrEl && addrEl instanceof HTMLInputElement){
        // only fill if address is empty to avoid overwriting user's input
        if(!addrEl.value || addrEl.value.trim() === '') addrEl.value = addr;
      }
      if(msg) msg.textContent = '住所を補完しました。必要に応じて番地以降を入力してください。';
    } else {
      if(msg) msg.textContent = j.message || '住所が見つかりませんでした。';
    }
  }catch(e){ const msg = document.getElementById('postal-lookup-msg'); if(msg) msg.textContent = '検索に失敗しました'; }
}

// Station search: uses a fallback sample list or an external endpoint if configured via window.STATION_API_ENDPOINT
async function searchStations(query){
  const trimmed = (query||'').toString().trim();
  if(!trimmed) return [];
  // If a global endpoint is provided, call it with ?q=...
  try{
    if(typeof window !== 'undefined' && (window).STATION_API_ENDPOINT){
      try{
        const endpoint = (window).STATION_API_ENDPOINT;
        const url = `${String(endpoint).replace(/\/?$/,'')}` + `?q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url);
        if(res.ok){ const j = await res.json(); return Array.isArray(j)? j : []; }
      }catch(e){ /* fall through to sample fallback */ }
    }
  }catch(e){ /* ignore and fallback */ }
  // fallback sample stations (simple fuzzy match)
  const SAMPLE = [
    { name: '表参道駅', line: '東京メトロ千代田線／半蔵門線／銀座線', exit: 'B2' },
    { name: '原宿駅', line: 'JR山手線', exit: '表参道口' },
    { name: '渋谷駅', line: 'JR/東急/東京メトロ', exit: 'ハチ公口' },
    { name: '新宿駅', line: 'JR/小田急/京王/東京メトロ', exit: '西口' }
  ];
  const q = trimmed.replace(/駅$/,'');
  return SAMPLE.filter(s=> s.name.indexOf(q) !== -1 || (s.line && s.line.indexOf(q)!==-1));
}

function renderStationResults(list){
  const host = document.getElementById('station-search-results');
  if(!host) return;
  host.textContent = '';
  if(!Array.isArray(list) || list.length === 0){ const d = document.createElement('div'); d.className = 'muted'; d.textContent = '候補が見つかりませんでした'; host.appendChild(d); return; }
  const ul = document.createElement('div'); ul.style.display = 'flex'; ul.style.flexDirection = 'column'; ul.style.gap = '6px';
  list.forEach(it=>{
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn btn-ghost'; btn.style.textAlign = 'left';
    const label = `${it.name}${it.exit ? ' / 出口:' + it.exit : ''}${it.line? ' / ' + it.line : ''}`;
    btn.textContent = label;
    btn.addEventListener('click', ()=>{
      const stEl = document.getElementById('profile-access-station');
      const exitEl = document.getElementById('profile-access-exit');
      if(stEl && stEl instanceof HTMLInputElement) stEl.value = it.name;
      if(exitEl && exitEl instanceof HTMLInputElement && it.exit) exitEl.value = it.exit;
      // clear results after selection
  host.textContent = '';
    });
    ul.appendChild(btn);
  });
  host.appendChild(ul);
}

(function init(){
  const form = document.getElementById('provider-profile-form');
  if(form){ form.addEventListener('submit', onSubmit); }
  const reset = document.getElementById('provider-profile-reset');
  if(reset){ reset.addEventListener('click', onReset); }
  loadToForm();
  // initialize business hours toggles after form values loaded
  initBusinessHoursToggles();
  // multiple-store controls removed; provider has a single store
  // postal lookup wiring
    try{
      const postalBtn = document.getElementById('postal-lookup-btn');
      if(postalBtn){ postalBtn.addEventListener('click', (e)=>{ lookupPostalCode(); }); }
      const stationBtn = document.getElementById('station-search-btn');
      if(stationBtn){
        stationBtn.addEventListener('click', async ()=>{
          const stInputEl = document.getElementById('profile-access-station');
          const q = (stInputEl && stInputEl instanceof HTMLInputElement) ? stInputEl.value : '';
          const list = await searchStations(q);
          renderStationResults(list);
        });
      }
      // allow Enter key in station input to trigger search
      const stInput = document.getElementById('profile-access-station');
      if(stInput && stInput instanceof HTMLInputElement){ stInput.addEventListener('keydown', (ev)=>{ if(ev.key === 'Enter'){ ev.preventDefault(); const stationBtnEl = document.getElementById('station-search-btn'); stationBtnEl && stationBtnEl.click(); } }); }
    }catch(e){ /* ignore */ }

  // File upload handlers: upload to a small server that generates srcset and returns URLs
  try{
    const coverInput = document.getElementById('profile-coverUpload');
    if(coverInput && coverInput instanceof HTMLInputElement){
      coverInput.addEventListener('change', async (ev)=>{
        const files = Array.from(coverInput.files || []);
        if(files.length === 0) return;
    const statusEl = document.getElementById('profile-coverUploadStatus');
    const progressEl = document.getElementById('profile-coverProgress');
    if(progressEl && progressEl instanceof HTMLProgressElement){ progressEl.style.display = 'block'; progressEl.value = 0; }
    if(statusEl) statusEl.textContent = 'アップロード中...';
    // Upload single file and expect { coverSrcset, galleryUrls }
  const res = await uploadFiles(files, { asCover: true }, (pct)=>{ try{ if(progressEl && progressEl instanceof HTMLProgressElement){ progressEl.value = pct; } if(statusEl) statusEl.textContent = `アップロード中 ${Math.round(pct)}%`; }catch(e){} });
  if(progressEl && progressEl instanceof HTMLProgressElement){ progressEl.style.display = 'none'; progressEl.value = 0; }
  if(statusEl) statusEl.textContent = '';
        if(res && res.coverSrcset){
          const cs = document.getElementById('profile-coverSrcset'); if(cs && cs instanceof HTMLInputElement) cs.value = res.coverSrcset;
          const firstUrl = res.coverSrcset.split(',')[0].trim().split(' ')[0];
          const coverPreview = document.getElementById('profile-coverPreview'); if(coverPreview && coverPreview instanceof HTMLImageElement){ try{ const s = (typeof safeUrl === 'function') ? (safeUrl(firstUrl) || '') : (firstUrl || ''); if(s){ coverPreview.src = s; coverPreview.style.display = 'block'; } else { coverPreview.style.display = 'none'; } }catch(e){ coverPreview.src = firstUrl; coverPreview.style.display = 'block'; } }
          const msg = document.getElementById('provider-profile-message'); if(msg) msg.textContent = 'カバー画像をアップロードしました（srcset を自動設定）。';
          // auto-submit/save
          try{ const f = document.getElementById('provider-profile-form'); if(f && typeof f.requestSubmit === 'function'){ f.requestSubmit(); } else if(f){ f.dispatchEvent(new Event('submit', { bubbles:true, cancelable:true })); } }catch(e){ console.error('auto-save failed', e); }
        }
      });
    }
    const galleryInput = document.getElementById('profile-galleryUpload');
    if(galleryInput && galleryInput instanceof HTMLInputElement){
      galleryInput.addEventListener('change', async (ev)=>{
        const files = Array.from(galleryInput.files || []);
        if(files.length === 0) return;
    const statusEl = document.getElementById('profile-galleryUploadStatus');
    const progressEl = document.getElementById('profile-galleryProgress');
    if(progressEl && progressEl instanceof HTMLProgressElement){ progressEl.style.display = 'block'; progressEl.value = 0; }
  const res = await uploadFiles(files, { asCover: false }, (pct)=>{ try{ if(progressEl && progressEl instanceof HTMLProgressElement){ progressEl.value = pct; } if(statusEl) statusEl.textContent = `アップロード中 ${Math.round(pct)}%`; }catch(e){} });
  if(progressEl && progressEl instanceof HTMLProgressElement){ progressEl.style.display = 'none'; progressEl.value = 0; }
  if(statusEl) statusEl.textContent = '';
        if(res && Array.isArray(res.galleryUrls) && res.galleryUrls.length){
          const g = document.getElementById('profile-gallery');
          if(g && g instanceof HTMLTextAreaElement){
            const existing = g.value ? g.value.split(/\r?\n/).map(s=> s.trim()).filter(Boolean) : [];
            const merged = existing.concat(res.galleryUrls).filter(Boolean);
            g.value = merged.join('\n');
            const msg = document.getElementById('provider-profile-message'); if(msg) msg.textContent = 'ギャラリー画像をアップロードしました。';
            // render previews (draggable + delete)
            try{ renderGalleryPreviewItems(merged); }catch(e){}
            // auto-submit/save
            try{ const f = document.getElementById('provider-profile-form'); if(f && typeof f.requestSubmit === 'function'){ f.requestSubmit(); } else if(f){ f.dispatchEvent(new Event('submit', { bubbles:true, cancelable:true })); } }catch(e){ console.error('auto-save failed', e); }
          }
        }
      });
    }
    // Cover video upload handling
    const coverVideoInput = document.getElementById('profile-coverVideoUpload');
    if(coverVideoInput && coverVideoInput instanceof HTMLInputElement){
      coverVideoInput.addEventListener('change', async (ev)=>{
        const files = Array.from(coverVideoInput.files || []);
        if(files.length === 0) return;
        const file = files[0];
        const statusEl = document.getElementById('profile-coverVideoUploadStatus');
        const progressEl = document.getElementById('profile-coverVideoProgress');
        const preview = document.getElementById('profile-coverVideoPreview');
        if(progressEl && progressEl instanceof HTMLProgressElement){ progressEl.style.display = 'block'; progressEl.value = 0; }
        if(statusEl) statusEl.textContent = 'アップロード準備中...';
        try{
          // Use existing uploadFiles helper but request no sizes so server/presign treats it as original-only
          const res = await uploadFiles([file], { asCover: true, isVideo: true }, (pct)=>{ try{ if(progressEl && progressEl instanceof HTMLProgressElement) progressEl.value = pct; if(statusEl) statusEl.textContent = `アップロード中 ${Math.round(pct)}%`; }catch(e){} });
          if(progressEl && progressEl instanceof HTMLProgressElement){ progressEl.style.display = 'none'; progressEl.value = 0; }
          if(statusEl) statusEl.textContent = '';
          // extract video URL: prefer galleryUrls[0] or results[0].originalUrl or presign orig
          let videoUrl = null;
          if(res){
            if(Array.isArray(res.galleryUrls) && res.galleryUrls.length) videoUrl = res.galleryUrls[0];
            else if(Array.isArray(res.results) && res.results.length && res.results[0].originalUrl) videoUrl = res.results[0].originalUrl;
            else if(res.orig && res.orig.publicUrl) videoUrl = res.orig.publicUrl;
          }
          if(videoUrl){
            // set a hidden input or text field if present
            const vidField = document.getElementById('profile-coverVideo');
            if(vidField && (vidField instanceof HTMLInputElement || vidField instanceof HTMLTextAreaElement)){ vidField.value = videoUrl; }
            if(preview && preview instanceof HTMLVideoElement){ try{ const s = (typeof safeUrl === 'function') ? (safeUrl(videoUrl) || '') : (videoUrl || ''); if(s){ preview.src = s; preview.style.display = 'block'; try{ preview.play().catch(()=>{}); }catch(e){} } else { preview.src = ''; preview.style.display = 'none'; } }catch(e){ preview.src = videoUrl; preview.style.display = 'block'; try{ preview.play().catch(()=>{}); }catch(e){} } }
            const msg = document.getElementById('provider-profile-message'); if(msg) msg.textContent = 'カバー動画をアップロードしました。';
            // auto-submit/save
            try{ const f = document.getElementById('provider-profile-form'); if(f && typeof f.requestSubmit === 'function'){ f.requestSubmit(); } else if(f){ f.dispatchEvent(new Event('submit', { bubbles:true, cancelable:true })); } }catch(e){ console.error('auto-save failed', e); }
          }
        }catch(e){ console.error('cover video upload failed', e); if(statusEl) statusEl.textContent = 'アップロードに失敗しました'; }
      });
    }
  }catch(e){ console.error('upload wiring failed', e); }
})();

// Upload helper using XHR so we can show progress. onProgress receives percent (0-100).
function uploadFiles(files, opts, onProgress){
  // Try presign/direct-to-S3 flow first. If anything fails, fall back to server POST /upload
  return new Promise(async (resolve, reject)=>{
  const serverBase = (typeof window !== 'undefined' && window.UPLOAD_SERVER_URL) ? window.UPLOAD_SERVER_URL : 'http://localhost:4000';
  const sizes = (opts && opts.isVideo) ? [] : [320,640,1200];
    // helper: resize image file to width using canvas -> Blob
    function resizeImageToBlob(file, width, mimeType){
      return new Promise((resolveResize, rejectResize)=>{
        try{
          const url = URL.createObjectURL(file);
          const img = new Image();
          img.onload = function(){
            try{
              const ratio = img.naturalHeight / img.naturalWidth || 1;
              const w = Math.min(width, img.naturalWidth);
              const h = Math.round(w * ratio);
              const canvas = document.createElement('canvas');
              canvas.width = w; canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              canvas.toBlob(function(blob){
                URL.revokeObjectURL(url);
                if(blob) resolveResize(blob); else rejectResize(new Error('toBlob failed'));
              }, mimeType || 'image/jpeg', 0.85);
            }catch(err){ URL.revokeObjectURL(url); rejectResize(err); }
          };
          img.onerror = function(err){ URL.revokeObjectURL(url); rejectResize(err || new Error('image load error')); };
          try{
            if(typeof url === 'string' && (url.startsWith('blob:') || url.startsWith('data:'))){
              img.src = url;
            }else{
              const s = (typeof safeUrl === 'function') ? safeUrl(url) : url;
              if(s) img.src = s;
            }
          }catch(e){ img.src = url; }
        }catch(e){ rejectResize(e); }
      });
    }

    // helper: PUT a blob with XHR so we get progress events
    function putBlobWithXhr(url, blob, contentType, onPutProgress){
      return new Promise((resPut, rejPut)=>{
        try{
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', url, true);
          if(contentType) try{ xhr.setRequestHeader('Content-Type', contentType); }catch(e){}
          xhr.upload.onprogress = function(e){ if(e.lengthComputable && typeof onPutProgress === 'function'){ const pct = (e.loaded / e.total) * 100; try{ onPutProgress(pct); }catch(_){} } };
          xhr.onload = function(){ if(xhr.status >= 200 && xhr.status < 300){ resPut(xhr.response); } else { rejPut(new Error('PUT failed ' + xhr.status)); } };
          xhr.onerror = function(err){ rejPut(err || new Error('PUT xhr error')); };
          xhr.send(blob);
        }catch(e){ rejPut(e); }
      });
    }

    // determine preferred strategy: 'server' (default) or 'direct' (presign)
    const strategyEl = document.getElementById('profile-uploadStrategy');
    const strategy = (strategyEl && strategyEl instanceof HTMLSelectElement) ? strategyEl.value : (typeof window !== 'undefined' && window.UPLOAD_PREFERRED_STRATEGY) ? window.UPLOAD_PREFERRED_STRATEGY : 'server';

    // try presign endpoint only when strategy is 'direct'
    let presignSupported = false;
    if(strategy === 'direct'){
      try{
        const presignUrl = serverBase.replace(/\/$/, '') + '/presign';
      // Build a basic presign request for multiple files (we'll request per-file)
      const results = { results: [], coverSrcset: null, galleryUrls: [] };
      // we will track progress as completedUploads/totalUploads
      let totalUploads = 0; let completedUploads = 0;
      // First, obtain presigns for all files
      const presignList = [];
      for(const f of files){
        try{
          const body = { filename: f.name, sizes };
          const headers = { 'Content-Type': 'application/json' };
          try{ if(typeof window !== 'undefined' && window.UPLOAD_API_KEY) headers['x-api-key'] = window.UPLOAD_API_KEY; }catch(e){}
          const resp = await fetch(presignUrl, { method: 'POST', headers, body: JSON.stringify(body) });
          if(!resp.ok){ throw new Error('presign failed ' + resp.status); }
          const j = await resp.json();
          if(!j || !j.ok) throw new Error('presign response not ok');
          presignList.push({ file: f, presignData: j });
          // each file will require presigns.presigns.length uploads + 1 orig
          totalUploads += (Array.isArray(j.presigns) ? j.presigns.length : 0) + (j.orig ? 1 : 0);
        }catch(e){ console.warn('presign request failed for', f.name, e); throw e; }
      }
      presignSupported = presignList.length === files.length;
  if(presignSupported){
        // perform uploads per file
        for(const entry of presignList){
          const f = entry.file; const pd = entry.presignData;
          // upload resized blobs for each size
          for(const p of (pd.presigns || [])){
            try{
              // create resized blob
              const blob = await resizeImageToBlob(f, Number(p.size), f.type || 'image/jpeg');
              await putBlobWithXhr(p.presignedUrl, blob, blob.type || f.type || 'application/octet-stream', function(pct){
                // approximate overall progress
                // each individual PUT reports its own progress; we'll combine by completedUploads + (pct/100)
                const approx = ((completedUploads + pct/100) / (totalUploads || 1)) * 100;
                try{ if(typeof onProgress === 'function') onProgress(approx); }catch(_){}
              });
              completedUploads++;
            }catch(e){ console.error('upload to presigned size failed', e); throw e; }
          }
          // upload original
          if(pd.orig && pd.orig.presignedUrl){
            try{
              await putBlobWithXhr(pd.orig.presignedUrl, f, f.type || 'application/octet-stream', function(pct){ const approx = ((completedUploads + pct/100) / (totalUploads || 1)) * 100; try{ if(typeof onProgress === 'function') onProgress(approx); }catch(_){} });
              completedUploads++;
            }catch(e){ console.error('upload original presigned failed', e); throw e; }
          }
          // build result record for this file
          const srcset = (pd.presigns || []).map(pp=> `${pp.publicUrl} ${pp.size}w`).join(', ');
          const galleryUrl = (pd.presigns && pd.presigns.length) ? pd.presigns[pd.presigns.length-1].publicUrl : (pd.orig ? pd.orig.publicUrl : null);
          results.results.push({ originalName: f.name, urls: (pd.presigns || []).reduce((acc,pp)=>{ acc[pp.size] = pp.publicUrl; return acc; }, {}), generated: (pd.presigns || []).map(pp=>({ size: pp.size, url: pp.publicUrl })), originalUrl: (pd.orig && pd.orig.publicUrl) || null, srcset });
        }
        results.coverSrcset = results.results.length === 1 ? results.results[0].srcset : null;
        results.galleryUrls = results.results.map(r=> r.generated && r.generated.length ? r.generated[r.generated.length-1].url : r.originalUrl).filter(Boolean);
        return resolve(results);
      }
      }catch(e){ console.warn('presign flow failed, falling back to server upload', e); /* fall through to multipart POST */ }
    } else {
      // strategy !== 'direct' -> skip presign and go straight to server upload
    }

    // fallback: multipart POST to /upload
    try{
      const url = serverBase + '/upload';
  const qs = (Array.isArray(sizes) && sizes.length) ? ('?sizes=' + sizes.join(',')) : '';
      const fd = new FormData();
      for(const f of files){ fd.append('files', f, f.name); }
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url + qs, true);
      try{ if(typeof window !== 'undefined' && window.UPLOAD_API_KEY){ xhr.setRequestHeader('x-api-key', window.UPLOAD_API_KEY); } }catch(e){}
      xhr.responseType = 'json';
      xhr.upload.onprogress = function(e){ if(e.lengthComputable && typeof onProgress === 'function'){ const pct = (e.loaded / e.total) * 100; try{ onProgress(pct); }catch(_){} } };
      xhr.onload = function(){ if(xhr.status >= 200 && xhr.status < 300){ resolve(xhr.response); } else { console.error('upload failed', xhr.status, xhr.responseText); reject(new Error('upload failed')); } };
      xhr.onerror = function(err){ console.error('upload XHR error', err); reject(err); };
      xhr.send(fd);
    }catch(e){ console.error('uploadFiles error', e); const msg = document.getElementById('provider-profile-message'); if(msg) msg.textContent = '画像のアップロードに失敗しました'; reject(e); }
  });
}

// Render gallery preview items (draggable + delete). items: array of url strings
function renderGalleryPreviewItems(items){
  const container = document.getElementById('profile-gallery-preview');
  if(!container) return;
  container.textContent = '';
  items.forEach((u, idx)=>{
    try{
      const item = document.createElement('div');
      item.className = 'gallery-thumb';
      item.draggable = true;
      item.style.display = 'flex';
      item.style.flexDirection = 'column';
      item.style.alignItems = 'center';
      item.style.gap = '6px';

      const img = document.createElement('img');
      try{
        if(typeof u === 'string' && (u.startsWith('blob:') || u.startsWith('data:'))){ img.src = u; }
        else{ const s = (typeof safeUrl === 'function') ? safeUrl(u) : u; if(s) img.src = s; }
      }catch(e){ img.src = u; }
      img.style.width = '96px'; img.style.height = '64px'; img.style.objectFit = 'cover'; img.style.borderRadius = '6px'; img.style.border = '1px solid var(--color-border)';
      const btns = document.createElement('div'); btns.style.display = 'flex'; btns.style.gap = '6px';
      const del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-ghost'; del.textContent = '削除'; del.style.fontSize = '12px';
      del.addEventListener('click', ()=>{ const list = currentGalleryList(); const filtered = list.filter(x=> x !== u); renderGalleryPreviewItems(filtered); updateGalleryTextareaAndSave(filtered); });
      btns.appendChild(del);
      item.appendChild(img); item.appendChild(btns);
      // drag handlers
      item.addEventListener('dragstart', (ev)=>{ ev.dataTransfer && ev.dataTransfer.setData('text/plain', u); item.classList.add('dragging'); });
      item.addEventListener('dragend', ()=>{ item.classList.remove('dragging'); });
      item.addEventListener('dragover', (ev)=>{ ev.preventDefault(); });
      item.addEventListener('drop', (ev)=>{ ev.preventDefault(); try{ const srcUrl = ev.dataTransfer && ev.dataTransfer.getData('text/plain'); if(!srcUrl) return; const list = currentGalleryList(); const srcIdx = list.indexOf(srcUrl); const dstIdx = idx; if(srcIdx === -1) return; // reorder
        list.splice(srcIdx,1); list.splice(dstIdx,0,srcUrl); renderGalleryPreviewItems(list); updateGalleryTextareaAndSave(list); }catch(e){} });
      container.appendChild(item);
    }catch(e){}
  });
}

function currentGalleryList(){ const t = document.getElementById('profile-gallery'); if(!t || !(t instanceof HTMLTextAreaElement)) return []; return t.value.split(/\r?\n/).map(s=> s.trim()).filter(Boolean); }

function updateGalleryTextareaAndSave(list){ const t = document.getElementById('profile-gallery'); if(t && t instanceof HTMLTextAreaElement){ t.value = list.join('\n'); } try{ const f = document.getElementById('provider-profile-form'); if(f && typeof f.requestSubmit === 'function'){ f.requestSubmit(); } else if(f){ f.dispatchEvent(new Event('submit', { bubbles:true, cancelable:true })); } }catch(e){ console.error('auto-save failed', e); } }
