// Provider services management (localStorage)
import { loadOptions } from './options.js';
export {};
// local binding to global safeUrl if provided by helper script
const safeUrl = (typeof globalThis !== 'undefined' && typeof globalThis.safeUrl === 'function') ? globalThis.safeUrl : null;
// Storage keys
const PROVIDERS_KEY = 'glowup:providers';
const PROVIDER_SESSION_KEY = 'glowup:providerSession';
const SERVICES_KEY = 'glowup:services';
// Drag state for gallery reordering
let _draggingGalleryItem = null;

function $(s, root=document){ return root.querySelector(s); }
function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

// Ensure gallery preview grid styles are present (idempotent)
function ensureGalleryStyles(){
  if(document.getElementById('fineme-gallery-styles')) return;
  const css = `
    #gallery-preview{ display:flex; flex-wrap:wrap; gap:8px; align-items:flex-start; }
    .gallery-item{ display:flex; flex-direction:column; align-items:center; gap:6px; width:120px; }
    .gallery-item img{ width:120px; height:90px; object-fit:cover; border-radius:6px; }
    .gallery-item button{ width:100%; }
    @media (max-width:640px){
      .gallery-item{ width:calc(50% - 8px); }
    }
    @media (max-width:420px){
      .gallery-item{ width:calc(100% - 8px); }
    }
    .gallery-item.dragging{ opacity:0.45; }
  `;
  const s = document.createElement('style'); s.id = 'fineme-gallery-styles'; s.appendChild(document.createTextNode(css)); document.head.appendChild(s);
}

  // Attach drag & drop handlers to gallery preview container so provider can reorder images
  function attachGalleryHandlers(container){
    if(!container) return;
    const items = Array.from(container.querySelectorAll('.gallery-item'));
    items.forEach(item => {
      item.setAttribute('draggable','true');
      item.style.cursor = 'grab';
      if(item._droppedHandlersAttached) return; // avoid dup
      item._droppedHandlersAttached = true;
      item.addEventListener('dragstart', (e)=>{
        _draggingGalleryItem = item;
        item.classList.add('dragging');
        try{ e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'drag'); }catch{};
      });
      item.addEventListener('dragend', ()=>{
        if(_draggingGalleryItem) _draggingGalleryItem.classList.remove('dragging');
        _draggingGalleryItem = null;
      });
      item.addEventListener('dragover', (e)=>{
        e.preventDefault();
        const after = getDragAfterElement(container, e.clientY);
        if(!after){ container.appendChild(_draggingGalleryItem); }
        else { container.insertBefore(_draggingGalleryItem, after); }
      });
    });
  }

  function getDragAfterElement(container, y){
    const draggableElements = [...container.querySelectorAll('.gallery-item:not(.dragging)')];
    for(const child of draggableElements){
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if(offset < 0) return child;
    }
    return null;
  }

function loadServices(){
  try{
    const raw = localStorage.getItem(SERVICES_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
function saveServices(list){
  localStorage.setItem(SERVICES_KEY, JSON.stringify(list));
  // auto export if enabled
  try{
    const cb = document.getElementById('services-auto-export');
    if(cb && cb instanceof HTMLInputElement && cb.checked){
      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `services-backup-${ts}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
  }catch{}
}

function getSession(){
  try{
    const raw = sessionStorage.getItem(PROVIDER_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch{ return null; }
}

function uuid(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function renderList(){
  const session = getSession();
  const tbody = $('#provider-services-tbody');
  if(!tbody || !session) return;
  const all = loadServices();
  // backfill: ensure published field exists
  for(const s of all){
    if(typeof s.published === 'undefined') s.published = false;
    // migrate priceMin -> price
    if(typeof s.price === 'undefined' && typeof s.priceMin !== 'undefined') s.price = s.priceMin;
  }
  saveServices(all);
  const mine = all.filter(s => s.providerId === session.id);
  // Build table rows using DOM APIs to avoid HTML injection
  tbody.textContent = '';
  for(const s of mine){
    const tr = document.createElement('tr');
    const tdName = document.createElement('td'); tdName.setAttribute('data-label','サービス名'); tdName.textContent = s.name || ''; tr.appendChild(tdName);
    const tdRegion = document.createElement('td'); tdRegion.setAttribute('data-label','地域'); tdRegion.textContent = regionLabel(s.region) || ''; tr.appendChild(tdRegion);
    const tdCat = document.createElement('td'); tdCat.setAttribute('data-label','カテゴリ'); tdCat.textContent = categoryLabel(s.category) || ''; tr.appendChild(tdCat);
    const tdPurpose = document.createElement('td'); tdPurpose.setAttribute('data-label','目的'); tdPurpose.textContent = purposeLabel(s.purpose||'') || ''; tr.appendChild(tdPurpose);
    const tdPrice = document.createElement('td'); tdPrice.setAttribute('data-label','料金'); tdPrice.textContent = `¥${Number((s.price!=null?s.price:s.priceMin)||0).toLocaleString()}`; tr.appendChild(tdPrice);
    const tdPub = document.createElement('td'); tdPub.setAttribute('data-label','公開'); tdPub.textContent = s.published ? '公開' : '非公開'; tr.appendChild(tdPub);
    const tdCreated = document.createElement('td'); tdCreated.setAttribute('data-label','作成日'); tdCreated.textContent = new Date(s.createdAt).toLocaleString(); tr.appendChild(tdCreated);
    const tdOps = document.createElement('td'); tdOps.setAttribute('data-label','操作'); tdOps.className = 'cluster';
    const btnEdit = document.createElement('button'); btnEdit.className = 'btn btn-ghost'; btnEdit.setAttribute('data-action','edit'); btnEdit.setAttribute('data-id', s.id); btnEdit.textContent = '編集';
    const btnToggle = document.createElement('button'); btnToggle.className = 'btn btn-ghost'; btnToggle.setAttribute('data-action','toggle-pub'); btnToggle.setAttribute('data-id', s.id); btnToggle.textContent = s.published ? '非公開にする' : '公開する';
    const btnDelete = document.createElement('button'); btnDelete.className = 'btn btn-ghost danger'; btnDelete.setAttribute('data-action','delete'); btnDelete.setAttribute('data-id', s.id); btnDelete.textContent = '削除';
    tdOps.appendChild(btnEdit); tdOps.appendChild(btnToggle); tdOps.appendChild(btnDelete); tr.appendChild(tdOps);
    tbody.appendChild(tr);
  }
}

// 改善余地スコアを算出（不足が多いほど高スコア）
function improvementScore(s){
  let score = 0;
  const fsLen = String(s.firstSessionPlan||'').length;
  const rpLen = String(s.riskPolicy||'').length;
  const qaCnt = Array.isArray(s.qaList) ? s.qaList.filter(it=> it&&it.q&&it.a).length : 0;
  const descLen = String(s.description||'').length;
  if(fsLen < 80) score += 3;
  if(rpLen < 60) score += 2;
  if(qaCnt === 0) score += 3; else if(qaCnt < 2) score += 2;
  if(descLen < 150) score += 2;
  return score;
}

function getStoreName(providerId, storeId){
  try{
    const provs = getProviders();
    const p = provs.find(x=> x.id === providerId);
    if(!p) return '';
    // Build store list from prov.stores when present, otherwise fallback to provider.profile
    const stores = Array.isArray(p.stores) ? p.stores : (p.profile ? [ { id: '', storeName: p.profile.storeName } ] : []);
    // If a specific storeId was provided, try to find it
    if(storeId){
      const st = stores.find(s=> String(s.id) === String(storeId));
      if(st) return st.storeName || '';
    }
    // Otherwise, prefer provider.profile.storeName if available
    if(p.profile && p.profile.storeName) return p.profile.storeName;
    // Fallback to first store name if any
    if(stores.length) return stores[0].storeName || '';
    return '';
  }catch{ return ''; }
}

function regionLabel(v){
  const map = {
    hokkaido:'北海道', aomori:'青森県', iwate:'岩手県', miyagi:'宮城県', akita:'秋田県', yamagata:'山形県', fukushima:'福島県',
    ibaraki:'茨城県', tochigi:'栃木県', gunma:'群馬県', saitama:'埼玉県', chiba:'千葉県', tokyo:'東京都', kanagawa:'神奈川県',
    niigata:'新潟県', toyama:'富山県', ishikawa:'石川県', fukui:'福井県', yamanashi:'山梨県', nagano:'長野県', gifu:'岐阜県',
    shizuoka:'静岡県', aichi:'愛知県', mie:'三重県', shiga:'滋賀県', kyoto:'京都府', osaka:'大阪府', hyogo:'兵庫県',
    nara:'奈良県', wakayama:'和歌山県', tottori:'鳥取県', shimane:'島根県', okayama:'岡山県', hiroshima:'広島県', yamaguchi:'山口県',
    tokushima:'徳島県', kagawa:'香川県', ehime:'愛媛県', kochi:'高知県', fukuoka:'福岡県', saga:'佐賀県', nagasaki:'長崎県',
    kumamoto:'熊本県', oita:'大分県', miyazaki:'宮崎県', kagoshima:'鹿児島県', okinawa:'沖縄県'
  };
  return map[v] || v;
}
function categoryLabel(v){
  const map = {
    consulting:'外見トータルサポート', gym:'パーソナルジム', makeup:'メイクアップ', hair:'ヘア',
  diagnosis:'カラー/骨格診断', fashion:'コーデ提案', photo:'写真撮影（アプリ等）', marriage:'結婚相談所',
    eyebrow:'眉毛', hairremoval:'脱毛', esthetic:'エステ', whitening:'ホワイトニング', orthodontics:'歯科矯正', nail:'ネイル'
  };
  return map[v] || v;
}

function purposeLabel(v){
  const map = {
    '': '',
    first_impression:'第一印象を変えたい',
    profile_photo:'プロフィール写真を良くしたい',
    confidence:'恋愛で自信を持ちたい',
    body_shape:'体を整えたい',
    know_what_suits:'自分に似合うものを知りたい',
    total_update:'トータルで磨く'
  };
  return map[v] || v;
}

function onSubmit(e){
  e.preventDefault();
  const session = getSession();
  if(!session){ location.href = '/pages/login.html'; return; }
  const form = e.currentTarget;
  const msg = $('#service-message');

  const fd = new FormData(form);
  const id = (fd.get('serviceId')||'').toString();
  const name = (fd.get('serviceName')||'').toString().trim();
  const region = (fd.get('region')||'').toString();
  const category = (fd.get('category')||'').toString();
  const purpose = (fd.get('purpose')||'').toString();
  const price = Number(fd.get('price')||0);
  const catchcopy = (fd.get('catchcopy')||'').toString().trim();
  const description = (fd.get('description')||'').toString();
  const firstSessionPlan = (fd.get('firstSessionPlan')||'').toString();
  const riskPolicy = (fd.get('riskPolicy')||'').toString();
  // collect menus and gallery will be resolved below
  // 複数選択の担当者（チェックボックスから収集）
  const staffIds = Array.from(document.querySelectorAll('#staff-checkboxes input[type="checkbox"]:checked')).map(el=> (el instanceof HTMLInputElement ? el.value : '')).filter(Boolean);
  const published = fd.get('published') ? true : false;

  // collect selected option ids (if any)
  const optionIds = Array.from(document.querySelectorAll('#options-checkboxes input[type="checkbox"]:checked')).map(el => (el instanceof HTMLInputElement ? el.value : '')).filter(Boolean);

  if(!name || !region || !category || isNaN(price)){
    if(msg) msg.textContent = '入力内容を確認してください。';
    return;
  }
  // Resolve staff names from provider profile staffs
  const staffInfos = staffIds.map(id=> resolveStaff(id)).filter(Boolean);
  const staffNames = staffInfos.map(s=> s.name);
  // メニュー編集は管理画面で非表示のため、collectMenuRows は削除

  function collectGalleryUrls(){
    const host = document.getElementById('gallery-preview'); if(!host) return [];
    // Respect current visual order: gallery items wrap img inside .gallery-item
    const imgs = Array.from(host.querySelectorAll('.gallery-item img[data-src]'));
    return imgs.map(img => img.getAttribute('data-src') || '').filter(Boolean);
  }

  // menus are intentionally not collected from the form (管理画面からは編集不可)

  // collect Q&A list from DOM
  function collectQaList(){
    const host = document.getElementById('qa-list'); if(!host) return [];
    const items = Array.from(host.querySelectorAll('.qa-item'));
    const out = [];
    for(const it of items){
      const qEl = it.querySelector('.qa-q'); const aEl = it.querySelector('.qa-a');
      const q = (qEl && (qEl instanceof HTMLInputElement)) ? qEl.value.trim() : '';
      const a = (aEl && (aEl instanceof HTMLTextAreaElement)) ? aEl.value.trim() : '';
      if(q && a){ out.push({ q, a }); }
    }
    return out;
  }

  const handleSave = (photoDataUrl, galleryUrls)=>{
    const all = loadServices();
      if(id){
        const idx = all.findIndex(s => s.id === id && s.providerId === session.id);
      if(idx === -1){ if(msg) msg.textContent = '編集対象が見つかりません。'; return; }
      all[idx] = { ...all[idx], name, region, category, purpose, price, catchcopy, description, firstSessionPlan, riskPolicy, qaList: collectQaList(), staffIds, staffNames, published, optionIds };
      if(photoDataUrl !== undefined){ all[idx].photo = photoDataUrl; }
      if(Array.isArray(galleryUrls)) all[idx].gallery = galleryUrls;
    }else{
      const newItem = {
        id: uuid(),
        providerId: session.id,
      name, region, category, purpose, price, catchcopy, description, firstSessionPlan, riskPolicy, qaList: collectQaList(), staffIds, staffNames,
        published,
        optionIds,
        photo: photoDataUrl || '',
        gallery: Array.isArray(galleryUrls) ? galleryUrls : [],
  // menus are not set via this form
        createdAt: new Date().toISOString()
      };
      all.push(newItem);
    }
    saveServices(all);
    resetForm();
    if(msg) msg.textContent = '保存しました。';
    renderList();
    closeServiceModal();
  };

  const photoEl = document.getElementById('photo');
  const file = (photoEl && photoEl instanceof HTMLInputElement && photoEl.files) ? photoEl.files[0] : null;
  // gallery input may contain multiple files
  const galleryEl = document.getElementById('gallery');
  const galleryFiles = (galleryEl && galleryEl instanceof HTMLInputElement && galleryEl.files) ? Array.from(galleryEl.files) : [];
  if(file){
    // process both main photo and gallery files
    if(galleryFiles.length){
      Promise.all(galleryFiles.map(f => resizeImageFile(f, 1200))).then(galleryUrls=>{
        // include any already-previewed URLs (e.g., previously uploaded or selected earlier)
        const existing = collectGalleryUrls();
        const merged = Array.from(new Set([].concat(existing, galleryUrls)));
        resizeImageFile(file, 1200).then(url => handleSave(url, merged));
      });
    }else{
      resizeImageFile(file, 1200).then(url => handleSave(url, collectGalleryUrls()));
    }
  }else{
    // If no main photo changed, still process gallery files if any
    if(galleryFiles.length){
      Promise.all(galleryFiles.map(f => resizeImageFile(f, 1200))).then(galleryUrls=>{
        const existing = collectGalleryUrls();
        const merged = Array.from(new Set([].concat(existing, galleryUrls)));
        handleSave(id ? undefined : '', merged);
      });
    }else{
      // undefined = keep existing photo when editing; '' = empty for new
      handleSave(id ? undefined : '', collectGalleryUrls());
    }
  }
}

function onTableClick(e){
  const btn = e.target.closest('button[data-action]');
  if(!btn) return;
  const id = btn.getAttribute('data-id');
  const all = loadServices();
  const idx = all.findIndex(s => s.id === id);
  if(idx === -1) return;
  const action = btn.getAttribute('data-action');
  if(action === 'delete'){
    if(!confirm('このサービスを削除しますか？')) return;
    all.splice(idx,1);
    saveServices(all);
    renderList();
  } else if(action === 'edit'){
    populateStaffOptions();
    populateOptionCheckboxes();
    loadToForm(all[idx]);
  } else if(action === 'toggle-pub'){
    all[idx].published = !all[idx].published;
    saveServices(all);
    renderList();
  }
}

function loadToForm(item){
  const form = document.getElementById('provider-service-form');
  if(!form) return;
  $('#serviceId').value = item.id;
  $('#serviceName').value = item.name;
  $('#region').value = item.region;
  $('#category').value = item.category;
  $('#purpose').value = item.purpose || '';
  $('#price').value = (item.price!=null?item.price:item.priceMin)||0;
  $('#catchcopy').value = item.catchcopy || '';
  $('#description').value = item.description || '';
  $('#firstSessionPlan').value = item.firstSessionPlan || '';
  $('#riskPolicy').value = item.riskPolicy || '';
  // メニュー行の自動挿入は無効（管理画面から編集不可）
  // フォームに複数担当者を反映
  const ids = Array.isArray(item.staffIds) ? item.staffIds : (item.staffId ? [item.staffId] : []);
  const boxWrap = document.getElementById('staff-checkboxes');
  if(boxWrap){
    for(const input of Array.from(boxWrap.querySelectorAll('input[type="checkbox"]'))){
      if(input instanceof HTMLInputElement){
        input.checked = ids.includes(input.value);
      }
    }
  }
  // reflect option selections if present
  const optIds = Array.isArray(item.optionIds) ? item.optionIds : [];
  const optWrap = document.getElementById('options-checkboxes');
  if(optWrap){
    for(const input of Array.from(optWrap.querySelectorAll('input[type="checkbox"]'))){
      if(input instanceof HTMLInputElement){ input.checked = optIds.includes(input.value); }
    }
  }
  $('#published').checked = !!item.published;
  // populate Q&A list
  try{
    const host = document.getElementById('qa-list'); if(host){
      host.textContent='';
      const arr = Array.isArray(item.qaList) ? item.qaList : [];
      for(const qa of arr){ addQaItem(host, qa.q||'', qa.a||''); }
    }
  }catch{}
  // preview photo
  const prev = document.getElementById('photo-preview');
  if(prev && prev instanceof HTMLImageElement){
    try{
      const s = (typeof safeUrl === 'function') ? (safeUrl(item.photo) || '') : (item.photo || '');
      if(s){ prev.src = s; prev.style.display = 'block'; }
      else { prev.src = ''; prev.style.display = 'none'; }
    }catch(e){ prev.src = item.photo || ''; prev.style.display = item.photo ? 'block' : 'none'; }
  }
  // populate gallery preview
  try{
    const ghost = document.getElementById('gallery-preview'); if(ghost){
      ghost.textContent = '';
      const gallery = Array.isArray(item.gallery) ? item.gallery : (item.photos ? item.photos : []);
      for(const url of gallery){
        const img = document.createElement('img');
        try{ const s = (typeof safeUrl === 'function') ? (safeUrl(url) || '') : (url || ''); if(s) img.src = s; }catch(e){ img.src = url; }
        img.setAttribute('data-src', url);
        img.style.maxWidth = '120px';
        img.style.maxHeight = '90px';
        img.style.borderRadius = '6px';
        img.style.objectFit = 'cover';
        const wrap = document.createElement('div'); wrap.className = 'gallery-item';
        const del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-ghost'; del.textContent = '削除'; del.addEventListener('click', ()=>{ wrap.remove(); });
        wrap.appendChild(img); wrap.appendChild(del); ghost.appendChild(wrap);
      }
      // enable drag & drop reordering
      try{ attachGalleryHandlers(ghost); }catch{}
    }
  }catch{}
  const submit = document.getElementById('service-submit');
  if(submit) submit.textContent = '更新';
  openServiceModal();
}

function resetForm(){
  const form = document.getElementById('provider-service-form');
  const msg = document.getElementById('service-message');
  if(form && form instanceof HTMLFormElement) form.reset();
  const idEl = document.getElementById('serviceId');
  if(idEl && idEl instanceof HTMLInputElement) idEl.value = '';
  const purposeEl = document.getElementById('purpose'); if(purposeEl && purposeEl instanceof HTMLSelectElement) purposeEl.value = ''; 
  const submit = document.getElementById('service-submit');
  if(submit) submit.textContent = '保存';
  if(msg) msg.textContent = '';
  const prev2 = document.getElementById('photo-preview');
  if(prev2 && prev2 instanceof HTMLImageElement){ prev2.src = ''; prev2.style.display = 'none'; }
  const qaHost = document.getElementById('qa-list'); if(qaHost) qaHost.textContent='';
}

(function init(){
  // inject gallery styles used by preview grid
  try{ ensureGalleryStyles(); }catch{}
  const form = document.getElementById('provider-service-form');
  const tbody = document.getElementById('provider-services-tbody');
  if(form){ form.addEventListener('submit', onSubmit); }
  if(tbody){ tbody.addEventListener('click', onTableClick); }
  // Import wiring
  const importInput = document.getElementById('services-import-input');
  if(importInput){ importInput.addEventListener('change', importServicesFile); }
  const cancel = document.getElementById('service-cancel');
  if(cancel){ cancel.addEventListener('click', ()=>{ resetForm(); closeServiceModal(); }); }
  const photoInput = document.getElementById('photo');
  const photoClear = document.getElementById('photo-clear');
  const prev = document.getElementById('photo-preview');
  if(photoInput){
    photoInput.addEventListener('change', async (e)=>{
      const tgt = e.target;
      const file = (tgt && tgt instanceof HTMLInputElement && tgt.files) ? tgt.files[0] : null;
      if(!file) return;
  const url = await resizeImageFile(file, 1200);
  if(prev && prev instanceof HTMLImageElement){ try{ const s = (typeof safeUrl === 'function') ? (safeUrl(url) || '') : (url || ''); if(s){ prev.src = s; prev.style.display = 'block'; } else { prev.src = ''; prev.style.display = 'none'; } }catch(e){ prev.src = url; prev.style.display = url ? 'block' : 'none'; } }
    });
  }
  // gallery input handling
  const galleryInput = document.getElementById('gallery');
  const galleryPreview = document.getElementById('gallery-preview');
  if(galleryInput && galleryPreview){
    galleryInput.addEventListener('change', async (e)=>{
      const tgt = e.target; const files = (tgt && tgt instanceof HTMLInputElement && tgt.files)? Array.from(tgt.files):[]; if(!files.length) return;
      const urls = await Promise.all(files.map(f => resizeImageFile(f, 1200)));
      for(const u of urls){
        const img = document.createElement('img');
        try{ const s = (typeof safeUrl === 'function') ? (safeUrl(u) || '') : (u || ''); if(s) img.src = s; }catch(e){ img.src = u; }
        img.setAttribute('data-src', u);
        img.style.maxWidth='120px';
        img.style.maxHeight='90px';
        img.style.borderRadius='6px';
        img.style.objectFit='cover';
  const wrap = document.createElement('div');
  wrap.className = 'gallery-item';
        const del = document.createElement('button');
        del.type='button';
        del.className='btn btn-ghost';
        del.textContent='削除';
        del.addEventListener('click', ()=> wrap.remove());
        wrap.appendChild(img);
        wrap.appendChild(del);
        galleryPreview.appendChild(wrap);
      }
      // enable drag & drop reordering after new items appended
      try{ attachGalleryHandlers(galleryPreview); }catch{}
    });
  }
  if(photoClear){
    photoClear.addEventListener('click', ()=>{
      const inp = document.getElementById('photo');
      if(inp && inp instanceof HTMLInputElement) inp.value = '';
      if(prev && prev instanceof HTMLImageElement){ prev.src = ''; prev.style.display = 'none'; }
    });
  }
  // store selection removed (one-provider == one-store model)
  // メニュー追加ボタンは削除済みのため処理なし
  renderList();
  populateStaffOptions();
  populateOptionCheckboxes();
  // Refresh option checkboxes when options are changed elsewhere
  try{ window.addEventListener('options:changed', ()=> populateOptionCheckboxes()); }catch(e){}
  // auto export toggle default OFF
  try{
    const key = 'glowup:services:autoExport';
    const cb = document.getElementById('services-auto-export');
    if(cb && cb instanceof HTMLInputElement){
      const saved = localStorage.getItem(key);
      if(saved === null){ cb.checked = false; localStorage.setItem(key,'0'); }
      else{ cb.checked = saved === '1'; }
      cb.addEventListener('change', ()=> localStorage.setItem(key, cb.checked ? '1':'0'));
    }
  }catch{}
  // modal open/close wiring
  const openBtn = document.getElementById('open-service-modal-btn');
  if(openBtn){ openBtn.addEventListener('click', ()=>{ resetForm(); populateStaffOptions(); populateOptionCheckboxes(); openServiceModal(); }); }
  // manage options button: handled by admin-options.js (opens modal). No-op here to avoid duplicate behavior.
  // (If you prefer opening the standalone admin page, uncomment the following.)
  // const manageBtn = document.getElementById('manage-options-btn');
  // if(manageBtn){ manageBtn.addEventListener('click', ()=>{ window.open('/pages/admin/options.html', '_blank'); }); }
  const closeBtn = document.getElementById('service-modal-close');
  if(closeBtn){ closeBtn.addEventListener('click', closeServiceModal); }
  const backdrop = document.getElementById('service-modal-backdrop');
  if(backdrop){ backdrop.addEventListener('click', closeServiceModal); }
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape'){ closeServiceModal(); }});
  // QA add button
  const qaAdd = document.getElementById('qa-add-btn'); const qaHost = document.getElementById('qa-list');
  if(qaAdd && qaHost){ qaAdd.addEventListener('click', ()=> addQaItem(qaHost)); }
  // 自動選択＆フォーカス誘導：?select=auto|{id} と focus（クエリ or ハッシュ）を解釈
  try{
    const url = new URL(location.href);
    const sel = url.searchParams.get('select');
    const focusParam = url.searchParams.get('focus');
    const hash = String(location.hash||'');
    const mHash = hash.match(/focus=([^&]+)/);
    const focusTarget = focusParam || (mHash ? decodeURIComponent(mHash[1]) : '');
    if(sel){
      const session = getSession(); const all = loadServices();
      const mine = session ? all.filter(s=> s.providerId===session.id) : [];
      let targetService = null;
      if(sel === 'auto'){
        // 最大スコアかつ作成日が古いものを優先
        targetService = mine.sort((a,b)=>{
          const sa = improvementScore(a), sb = improvementScore(b);
          if(sb!==sa) return sb-sa;
          const ta = new Date(a.createdAt||0).getTime();
          const tb = new Date(b.createdAt||0).getTime();
          return ta - tb;
        })[0] || null;
      }else{
        targetService = mine.find(s=> String(s.id) === String(sel)) || null;
      }
      // 開く・読み込む・フォーカス
      openServiceModal();
      if(targetService){ loadToForm(targetService); }
      if(focusTarget){
        if(focusTarget === 'qa-list'){
          const host = document.getElementById('qa-list'); if(host){ addQaItem(host); const firstQ = host.querySelector('.qa-item .qa-q'); if(firstQ && firstQ instanceof HTMLElement){ firstQ.focus(); } }
        }else{
          const el = document.getElementById(focusTarget);
          if(el){ el.scrollIntoView({behavior:'smooth', block:'center'}); if(el instanceof HTMLElement){ try{ el.focus(); }catch{} el.style.outline='2px solid var(--primary)'; setTimeout(()=>{ el.style.outline=''; }, 2000); } }
        }
      }
    }
  }catch{}
})();

function openServiceModal(){
  const modal = document.getElementById('service-modal');
  const backdrop = document.getElementById('service-modal-backdrop');
  if(modal){ modal.hidden = false; requestAnimationFrame(()=> modal.classList.add('is-open')); }
  if(backdrop){ backdrop.hidden = false; requestAnimationFrame(()=> backdrop.classList.add('is-open')); }
  document.body.classList.add('modal-open');
}
function closeServiceModal(){
  const modal = document.getElementById('service-modal');
  const backdrop = document.getElementById('service-modal-backdrop');
  if(modal){ modal.classList.remove('is-open'); }
  if(backdrop){ backdrop.classList.remove('is-open'); }
  // wait for transition end (~200ms)
  setTimeout(()=>{
    if(modal) modal.hidden = true;
    if(backdrop) backdrop.hidden = true;
  }, 200);
  document.body.classList.remove('modal-open');
}

// Import with merge: id優先、なければ新規作成。既存は providerId が同じものだけ更新
async function importServicesFile(e){
  const input = e.target;
  const file = (input && input instanceof HTMLInputElement && input.files) ? input.files[0] : null;
  if(!file) return;
  try{
    const text = await file.text();
    const arr = JSON.parse(text);
    if(!Array.isArray(arr)) throw new Error('invalid');
    const session = getSession();
    if(!session){ alert('セッションが切れています。再ログインしてください。'); input.value=''; return; }
    const current = loadServices();
    const byId = new Map(current.map(s=> [s.id, s]));
    let added=0, updated=0, skipped=0;
    const now = new Date().toISOString();
    for(const s of arr){
      if(!s || typeof s !== 'object'){ skipped++; continue; }
      // 他アカウントのサービスはスキップ
      const providerId = s.providerId || session.id; // providerIdが無い場合は自分名義として取り込む
      if(providerId !== session.id){ skipped++; continue; }
      if(!s.name || !s.region || !s.category){ skipped++; continue; }
      if(s.id && byId.has(s.id)){
        // 更新: id固定、createdAt維持
        const existing = byId.get(s.id);
        const merged = {
          ...existing,
          ...s,
          id: existing.id,
          providerId: session.id,
          createdAt: existing.createdAt || now
        };
        const idx = current.findIndex(x=> x.id === existing.id);
        if(idx !== -1){ current[idx] = merged; updated++; }
      }else{
        // 追加
        const item = {
          id: uuid(),
          providerId: session.id,
          name: s.name,
          region: s.region,
          category: s.category,
          purpose: s.purpose || '',
          // storeId removed in single-store model
          price: Number(s.price!=null ? s.price : (s.priceMin!=null ? s.priceMin : 0)) || 0,
          catchcopy: String(s.catchcopy||'').toString(),
          description: String(s.description||'').toString(),
          firstSessionPlan: String(s.firstSessionPlan||'').toString(),
          riskPolicy: String(s.riskPolicy||'').toString(),
          qaList: Array.isArray(s.qaList)? s.qaList.filter(it=> it && it.q && it.a) : [],
          staffIds: Array.isArray(s.staffIds) ? s.staffIds : (s.staffId ? [s.staffId] : []),
          staffNames: Array.isArray(s.staffNames) ? s.staffNames : [],
          photo: String(s.photo||'').toString(),
          published: !!s.published,
          createdAt: now
        };
        current.push(item); added++;
      }
    }
    saveServices(current);
    renderList();
    alert(`インポートしました。追加:${added}件 / 更新:${updated}件 / スキップ:${skipped}件`);
  }catch{
    alert('インポートに失敗しました。JSON形式をご確認ください。');
  }finally{
    const input2 = document.getElementById('services-import-input');
    if(input2 && input2 instanceof HTMLInputElement){ input2.value = ''; }
  }
}

// Resize image to max side = maxSize, return dataURL
function resizeImageFile(file, maxSize){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if(width > height){
          if(width > maxSize){ height = Math.round(height * (maxSize/width)); width = maxSize; }
        }else{
          if(height > maxSize){ width = Math.round(width * (maxSize/height)); height = maxSize; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
          img.onerror = reject;
          try{ const s = (typeof safeUrl === 'function') ? (safeUrl(String(reader.result || '')) || '') : String(reader.result || ''); img.src = s || String(reader.result || ''); }catch(e){ img.src = String(reader.result || ''); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Staff options from provider profile
function getProviders(){
  try{ const raw = localStorage.getItem(PROVIDERS_KEY); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr:[]; }catch{ return []; }
}
function resolveStaff(staffId){
  const session = getSession(); if(!session || !staffId) return null;
  const me = getProviders().find(p=> p.id === session.id);
  const arr = me?.profile?.staffs; if(!Array.isArray(arr)) return null;
  return arr.find(s=> s.id === staffId) || null;
}
function populateStaffOptions(){
  const wrap = document.getElementById('staff-checkboxes'); if(!wrap) return;
  const session = getSession(); if(!session){ wrap.textContent = ''; const span = document.createElement('span'); span.className = 'muted'; span.textContent = 'スタッフがいません'; wrap.appendChild(span); return; }
  const me = getProviders().find(p=> p.id === session.id);
  const list = Array.isArray(me?.profile?.staffs) ? me.profile.staffs : [];
  wrap.textContent = '';
  for(const s of list){
    const label = document.createElement('label'); label.className = 'cluster'; label.style.alignItems = 'center'; label.style.gap = '8px';
    const input = document.createElement('input'); input.type = 'checkbox'; input.name = 'staffIds'; input.value = String(s.id);
    const span = document.createElement('span'); span.textContent = s.name || '';
    if(s.role) span.textContent += `（${s.role}）`;
    label.appendChild(input); label.appendChild(span); wrap.appendChild(label);
  }
}

// Options (global) checkboxes population
function populateOptionCheckboxes(){
  const wrap = document.getElementById('options-checkboxes'); if(!wrap) return;
  const opts = loadOptions().filter(o=> o && o.active);
  if(!opts.length){ wrap.textContent = ''; const span = document.createElement('span'); span.className = 'muted'; span.textContent = '登録されたオプションはありません'; wrap.appendChild(span); return; }
  wrap.textContent = '';
  for(const o of opts){
    const label = document.createElement('label'); label.style.display = 'flex'; label.style.gap = '12px'; label.style.alignItems = 'flex-start';
    const input = document.createElement('input'); input.type = 'checkbox'; input.name = 'optionIds'; input.value = String(o.id);
    const div = document.createElement('div'); div.style.lineHeight = '1.2';
    const nameDiv = document.createElement('div'); nameDiv.style.fontWeight = '700'; nameDiv.textContent = o.name || '';
    const priceDiv = document.createElement('div'); priceDiv.style.color = 'var(--muted)'; priceDiv.style.fontSize = '13px'; priceDiv.textContent = o.price ? '¥' + Number(o.price).toLocaleString() : '';
    const descDiv = document.createElement('div'); descDiv.style.color = 'var(--muted)'; descDiv.style.fontSize = '13px'; descDiv.textContent = o.description ? String(o.description) : '';
    div.appendChild(nameDiv); div.appendChild(priceDiv); div.appendChild(descDiv);
    label.appendChild(input); label.appendChild(div); wrap.appendChild(label);
  }
}

// store select removed: services now belong to provider-level single store

// --- Q&A item helpers ---
function addQaItem(host, qInit='', aInit=''){
  try{
    const item = document.createElement('div'); item.className='qa-item card'; item.style.padding='8px';
    const q = document.createElement('input'); q.type='text'; q.className='qa-q'; q.placeholder='質問（例：初回の所要時間は？）'; q.value = qInit;
    const a = document.createElement('textarea'); a.rows=3; a.className='qa-a'; a.placeholder='回答（例：初回は60〜90分。目的整理→説明→提案→確認を行います。）'; a.value = aInit;
    const ops = document.createElement('div'); ops.className='cluster'; ops.style.justifyContent='flex-end';
    const del = document.createElement('button'); del.type='button'; del.className='btn btn-ghost'; del.textContent='削除'; del.addEventListener('click', ()=> item.remove());
    ops.appendChild(del);
    item.appendChild(q); item.appendChild(a); item.appendChild(ops);
    host.appendChild(item);
  }catch{}
}
