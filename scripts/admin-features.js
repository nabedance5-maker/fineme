// @ts-nocheck
// Admin Features (特集) Management
export {};
// Data model (localStorage key: 'glowup:features')
// Feature: { id, title, summary, body, status: 'draft'|'published'|'private', createdAt, updatedAt, thumbnail? }

const FEATURES_KEY = 'glowup:features';

function $(s, root=document){ return root.querySelector(s); }
function $all(s, root=document){ return Array.from(root.querySelectorAll(s)); }

function uuid(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0, v = c==='x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function loadFeatures(){
  try{
    const raw = localStorage.getItem(FEATURES_KEY);
    let arr = raw? JSON.parse(raw):[];
    if(!Array.isArray(arr)) arr = [];
    // migrate legacy items missing id/fields
    const now = new Date().toISOString();
    let changed = false;
    for(const f of arr){
      if(!f.id){ f.id = uuid(); changed = true; }
      if(!f.createdAt){ f.createdAt = now; changed = true; }
      if(!f.updatedAt){ f.updatedAt = f.createdAt; changed = true; }
      if(!f.status){ f.status = 'draft'; changed = true; }
      if(typeof f.thumbnail === 'undefined'){ f.thumbnail = ''; changed = true; }
    }
    if(changed){
      try{ saveFeatures(arr); }catch{}
    }
    return arr;
  }catch{ return []; }
}
function saveFeatures(list){
  localStorage.setItem(FEATURES_KEY, JSON.stringify(list));
  // auto export if enabled
  try{
    const cb = document.getElementById('features-auto-export');
    if(cb && cb instanceof HTMLInputElement && cb.checked){
      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `features-backup-${ts}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
  }catch{}
}

function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function fillForm(f){
  $('#feature-id').value = f?.id || '';
  $('#feature-title').value = f?.title || '';
  $('#feature-summary').value = f?.summary || '';
  const th = $('#feature-thumbnail');
  if(th){ th.value = f?.thumbnail || ''; }
  updateThumbPreview(f?.thumbnail||'');
  // RTE: set editor HTML and hidden textarea
  const html = f?.body || '';
  const ed = $('#feature-body-editor');
  if(ed){
    // When editor is hidden, defer setting content. Use sanitizer when available; otherwise set textContent to avoid executing HTML.
    ed.innerHTML = '';
    requestAnimationFrame(()=>{
      try{
        if(typeof sanitizeHtml === 'function'){
          ed.innerHTML = sanitizeHtml(html);
        } else {
          ed.textContent = html;
        }
      }catch(e){ ed.textContent = html; }
      try{ refreshToolbarState(); }catch(e){}
    });
  }
  $('#feature-body').value = html;
  $('#feature-status').value = f?.status || 'draft';
}

function readForm(){
  return {
    id: $('#feature-id').value || null,
    title: ($('#feature-title').value||'').trim(),
    summary: ($('#feature-summary').value||'').toString(),
    thumbnail: ($('#feature-thumbnail')?.value||'').toString().trim(),
    body: ($('#feature-body').value||'').toString(),
    status: $('#feature-status').value || 'draft'
  };
}

function renderTable(){
  const tbody = $('#features-table-body');
  if(!tbody) return;
  const list = loadFeatures().sort((a,b)=> new Date(b.updatedAt||b.createdAt).getTime() - new Date(a.updatedAt||a.createdAt).getTime());
  tbody.textContent = '';
  for(const f of list){
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', f.id);
    const tdTitle = document.createElement('td'); tdTitle.style.padding = '12px'; tdTitle.style.borderBottom = '1px solid var(--color-border)';
    const a = document.createElement('a'); a.className = 'svc-link'; a.href = `?id=${encodeURIComponent(f.id)}`; a.textContent = f.title || '(無題)'; tdTitle.appendChild(a);
    const tdStatus = document.createElement('td'); tdStatus.style.padding = '12px'; tdStatus.style.borderBottom = '1px solid var(--color-border)'; tdStatus.textContent = labelStatus(f.status);
    const tdDate = document.createElement('td'); tdDate.style.padding = '12px'; tdDate.style.borderBottom = '1px solid var(--color-border)'; tdDate.textContent = formatDate(f.updatedAt||f.createdAt);
    const tdOps = document.createElement('td'); tdOps.style.padding = '12px'; tdOps.style.borderBottom = '1px solid var(--color-border)';
    const aEdit = document.createElement('a'); aEdit.className = 'btn btn-ghost'; aEdit.href = `?id=${encodeURIComponent(f.id)}`; aEdit.textContent = '編集';
    const btnStatus = document.createElement('button'); btnStatus.type = 'button'; btnStatus.className = 'btn btn-ghost'; btnStatus.setAttribute('data-action','status'); btnStatus.setAttribute('data-id', f.id); btnStatus.textContent = '公開切替';
    const btnDelete = document.createElement('button'); btnDelete.type = 'button'; btnDelete.className = 'btn btn-ghost danger'; btnDelete.setAttribute('data-action','delete'); btnDelete.setAttribute('data-id', f.id); btnDelete.textContent = '削除';
    // preserve compatibility hooks via safe handlers instead of inline onclick
    btnStatus.addEventListener('click', ()=>{ if(window.__featureStatus) window.__featureStatus(f.id); });
    btnDelete.addEventListener('click', ()=>{ if(window.__featureDelete) window.__featureDelete(f.id); });
    tdOps.appendChild(aEdit); tdOps.appendChild(btnStatus); tdOps.appendChild(btnDelete);
    tr.appendChild(tdTitle); tr.appendChild(tdStatus); tr.appendChild(tdDate); tr.appendChild(tdOps);
    tbody.appendChild(tr);
  }
  // Explicit listeners to avoid CSP/Delegation issues
  // Row click fallback remains, but primary nav is via anchors
  const rows = tbody.querySelectorAll('tr[data-id]');
  rows.forEach(tr=>{
    tr.addEventListener('click', (e)=>{
      if(e.defaultPrevented) return;
      if(e.target.closest('a,button')) return; // anchors/buttons handle their own
  const id = tr.getAttribute('data-id');
  location.href = `?id=${encodeURIComponent(id)}`;
    });
  });
  const buttons = tbody.querySelectorAll('button[data-action]');
  buttons.forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const action = btn.getAttribute('data-action');
      if(action === 'edit') return openEditorForId(id);
      if(action === 'status') return window.__featureStatus(id);
      if(action === 'delete') return window.__featureDelete(id);
    });
  });
}

function labelStatus(s){
  switch(s){
    case 'published': return '公開';
    case 'private': return '非公開';
    case 'draft':
    default: return '下書き';
  }
}
function formatDate(iso){
  try{ return new Date(iso).toLocaleString(); }catch{ return ''; }
}

function onSubmit(e){
  e.preventDefault();
  // Normalize align and ensure editor -> textarea sync before reading form
  try{
    const ed = document.getElementById('feature-body-editor');
    const ta = document.getElementById('feature-body');
    if(ed){ normalizeAlignAttributes(ed); }
    if(ed && ta){ ta.value = sanitizeHtml(ed.innerHTML); }
  }catch{}
  const msg = $('#feature-message');
  const form = readForm();
  if(!form.title){ msg.textContent = 'タイトルは必須です。'; return; }
  // Warn for oversized data URL thumbnail before saving (rough check ~1MB)
  const isDataThumb = form.thumbnail && /^data:image\//i.test(form.thumbnail);
  if(isDataThumb && form.thumbnail.length > 1_000_000){
    msg.textContent = 'サムネイル画像が大きすぎます。サイズを小さくするかURL指定にしてください。';
    return;
  }
  const now = new Date().toISOString();
  const list = loadFeatures();
  if(form.id){
    const idx = list.findIndex(x=> x.id === form.id);
    if(idx !== -1){
      list[idx] = { ...list[idx], ...form, updatedAt: now };
    }
  }else{
    const item = { id: uuid(), ...form, createdAt: now, updatedAt: now };
    list.push(item);
    form.id = item.id;
  }
  try{
    saveFeatures(list);
  }catch(err){
    const name = (err && err.name) || '';
    if(name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'){ 
      msg.textContent = '保存できません（ブラウザの保存容量を超えました）。端末から選択した画像は容量が大きくなるため、サムネイル画像をURLにするか、画像サイズを小さくしてください。本文内の data:image も避けてください。';
      return;
    }
    msg.textContent = '保存中にエラーが発生しました。';
    return;
  }
  msg.textContent = '保存しました。';
  renderTable();
  fillForm(list.find(x=> x.id === form.id));
  // Reflect saved id in URL so it doesn't stay as ?id=new
  updateUrlForEdit(form.id);
}

function onSaveDraft(){
  const statusSelect = $('#feature-status');
  if(statusSelect) statusSelect.value = 'draft';
  const form = document.getElementById('feature-form');
  if(form && typeof form.requestSubmit === 'function'){
    form.requestSubmit();
  }else if(form){
    form.submit();
  }
}

function onNew(){
  fillForm({ status: 'draft' });
  $('#feature-message').textContent = '';
}

function onTableClick(e){
  const btn = e.target.closest('button[data-action]');
  let id = btn?.getAttribute('data-id');
  const tr = e.target.closest('tr[data-id]');
  // If clicked on row (non-button), open editor
  if(!btn && tr){
    id = tr.getAttribute('data-id');
    openEditorForId(id);
    return;
  }
  if(!btn) return;
  const list = loadFeatures();
  const idx = list.findIndex(f=> f.id === id);
  if(idx === -1) return;
  const action = btn.getAttribute('data-action');
  if(action === 'edit'){
    openEditorForId(list[idx].id);
  }else if(action === 'status'){
    const cur = list[idx].status || 'draft';
    const next = cur === 'published' ? 'private' : (cur === 'private' ? 'draft' : 'published');
    list[idx].status = next;
    list[idx].updatedAt = new Date().toISOString();
    saveFeatures(list); renderTable();
  }else if(action === 'delete'){
    if(!confirm('この特集を削除しますか？')) return;
    list.splice(idx,1); saveFeatures(list); renderTable();
  }
}

(function init(){
  const formEl = $('#feature-form');
  if(formEl){ formEl.addEventListener('submit', onSubmit); }
  // Explicit save button handler to ensure submit fires in all environments
  const btnSave = document.getElementById('feature-save');
  if(btnSave){
    btnSave.addEventListener('click', (e)=>{
      // Let form submission flow handle everything
      const form = document.getElementById('feature-form');
      if(form && typeof form.requestSubmit === 'function'){
        e.preventDefault();
        form.requestSubmit();
      }
    });
  }
  const btnDraft = $('#feature-save-draft');
  if(btnDraft){ btnDraft.addEventListener('click', onSaveDraft); }
  const btnNew = $('#feature-new');
  if(btnNew){ btnNew.addEventListener('click', onNew); }
  const tbody = $('#features-table-body');
  if(tbody){ tbody.addEventListener('click', onTableClick); }
  const btnCreate = $('#features-create');
  if(btnCreate){ btnCreate.addEventListener('click', ()=>{ onNew(); updateUrlForEdit('new'); showEditor(); }); }
  // auto export toggle default OFF
  try{
    const key = 'glowup:features:autoExport';
    const cb = document.getElementById('features-auto-export');
    if(cb && cb instanceof HTMLInputElement){
      const saved = localStorage.getItem(key);
      if(saved === null){ cb.checked = false; localStorage.setItem(key,'0'); }
      else{ cb.checked = saved === '1'; }
      cb.addEventListener('change', ()=> localStorage.setItem(key, cb.checked ? '1':'0'));
    }
  }catch{}
  // Export/Import wiring
  const btnExport = document.getElementById('features-export');
  if(btnExport){ btnExport.addEventListener('click', exportFeatures); }
  const importInput = document.getElementById('features-import-input');
  if(importInput){ importInput.addEventListener('change', importFeaturesFile); }
  const seedBtn = document.getElementById('features-seed');
  if(seedBtn){ seedBtn.addEventListener('click', seedFromStatic); }
  const restoreBtn = document.getElementById('features-restore');
  if(restoreBtn){ restoreBtn.addEventListener('click', restoreRecommendedSet); }
  const btnBack = $('#feature-back');
  if(btnBack){ btnBack.addEventListener('click', showList); }
  // RTE wiring
  const ed = $('#feature-body-editor');
  const ta = $('#feature-body');
  if(ed && ta){
    // Sync on input
    ed.addEventListener('input', ()=>{ ta.value = sanitizeHtml(ed.innerHTML); });
    // Heading select
    const sel = $('#rte-heading');
    if(sel){ sel.addEventListener('change', ()=>{
      const tag = sel.value || 'p';
      document.execCommand('formatBlock', false, tag);
    }); }
    // Toolbar buttons
    document.addEventListener('click', (e)=>{
      const btn = e.target.closest('.rte-btn');
      if(!btn) return;
      const cmd = btn.getAttribute('data-cmd');
      const val = btn.getAttribute('data-value');
      if(cmd === 'formatBlock' && val){ document.execCommand(cmd, false, val); return; }
      if(btn.id === 'rte-link'){
        const url = prompt('リンクURLを入力');
        if(url){ document.execCommand('createLink', false, url); }
        return;
      }
      if(btn.id === 'rte-image'){
        const url = prompt('画像URLを入力');
        if(url){ document.execCommand('insertImage', false, url); }
        return;
      }
      // Feature Builder quick inserts
      if(btn.id === 'rte-insert-grid'){
        const html = [
          '<div class="fb-grid">',
          '  <div class="fb-card fb-item" data-x="1" data-y="1" data-w="6" data-h="1">',
          '    <h3 class="fb-heading">カードタイトル</h3>',
          '    <p class="fb-text">説明文をここに。</p>',
          '    <img class="fb-image" src="" alt="" />',
          '  </div>',
          '  <div class="fb-block fb-item" data-x="7" data-y="1" data-w="6" data-h="1">',
          '    <h3 class="fb-heading">ブロック見出し</h3>',
          '    <p class="fb-text">テキストブロック。</p>',
          '  </div>',
          '</div>'
        ].join('\n');
        document.execCommand('insertHTML', false, html);
        const ed = document.getElementById('feature-body-editor');
        const ta = document.getElementById('feature-body');
        if(ed && ta){ ta.value = sanitizeHtml(ed.innerHTML); }
        refreshToolbarState();
        return;
      }
      if(btn.id === 'rte-insert-card'){
        const html = [
          '<div class="fb-card fb-item" data-x="1" data-y="1" data-w="6" data-h="1">',
          '  <h3 class="fb-heading">カードタイトル</h3>',
          '  <p class="fb-text">カード説明。</p>',
          '  <img class="fb-image" src="" alt="" />',
          '</div>'
        ].join('\n');
        document.execCommand('insertHTML', false, html);
        const ed = document.getElementById('feature-body-editor');
        const ta = document.getElementById('feature-body');
        if(ed && ta){ ta.value = sanitizeHtml(ed.innerHTML); }
        refreshToolbarState();
        return;
      }
      if(btn.id === 'rte-insert-block'){
        const html = [
          '<div class="fb-block fb-item" data-x="1" data-y="1" data-w="12" data-h="1">',
          '  <h3 class="fb-heading">ブロック見出し</h3>',
          '  <p class="fb-text">本文テキスト。</p>',
          '</div>'
        ].join('\n');
        document.execCommand('insertHTML', false, html);
        const ed = document.getElementById('feature-body-editor');
        const ta = document.getElementById('feature-body');
        if(ed && ta){ ta.value = sanitizeHtml(ed.innerHTML); }
        refreshToolbarState();
        return;
      }
      if(btn.id === 'rte-insert-slider'){
        const html = [
          '<div class="fb-slider fb-item" data-x="1" data-y="1" data-w="12" data-h="1">',
          '  <div class="fb-slide fb-card">',
          '    <h3 class="fb-heading">スライド1</h3>',
          '    <p class="fb-text">説明1</p>',
          '  </div>',
          '  <div class="fb-slide fb-card">',
          '    <h3 class="fb-heading">スライド2</h3>',
          '    <p class="fb-text">説明2</p>',
          '  </div>',
          '</div>'
        ].join('\n');
        document.execCommand('insertHTML', false, html);
        const ed = document.getElementById('feature-body-editor');
        const ta = document.getElementById('feature-body');
        if(ed && ta){ ta.value = sanitizeHtml(ed.innerHTML); }
        refreshToolbarState();
        return;
      }
      if(btn.id === 'rte-insert-image-block'){
        const html = [
          '<div class="fb-item" data-x="1" data-y="1" data-w="12" data-h="1">',
          '  <img class="fb-image" src="" alt="" />',
          '</div>'
        ].join('\n');
        document.execCommand('insertHTML', false, html);
        const ed = document.getElementById('feature-body-editor');
        const ta = document.getElementById('feature-body');
        if(ed && ta){ ta.value = sanitizeHtml(ed.innerHTML); }
        refreshToolbarState();
        return;
      }
      if(btn.id === 'rte-align-left'){
        document.execCommand('justifyLeft', false, null);
        const ed = document.getElementById('feature-body-editor');
        if(ed){ normalizeAlignAttributes(ed); }
        refreshToolbarState();
        return;
      }
      if(btn.id === 'rte-align-center'){
        document.execCommand('justifyCenter', false, null);
        const ed = document.getElementById('feature-body-editor');
        if(ed){ normalizeAlignAttributes(ed); }
        refreshToolbarState();
        return;
      }
      if(btn.id === 'rte-align-right'){
        document.execCommand('justifyRight', false, null);
        const ed = document.getElementById('feature-body-editor');
        if(ed){ normalizeAlignAttributes(ed); }
        refreshToolbarState();
        return;
      }
      if(btn.id === 'rte-image-file'){
        const fileEl = document.getElementById('rte-image-file-input');
        if(fileEl){ fileEl.click(); }
        return;
      }
      if(cmd){ document.execCommand(cmd, false, null); }
      // after command, refresh toolbar state
      refreshToolbarState();
    });
    // On submit ensure sync
    // normalization is handled inside onSubmit to guarantee ordering
    // Selection and caret movement: refresh toolbar
    document.addEventListener('selectionchange', ()=>{
      // only react when selection is inside editor
      const sel = window.getSelection();
      if(!sel || sel.rangeCount === 0) return;
      const node = sel.anchorNode;
      if(node && ed.contains(node)){ refreshToolbarState(); }
    });
    ed.addEventListener('keyup', refreshToolbarState);
    ed.addEventListener('mouseup', refreshToolbarState);
  }
  // RTE: image size select handling
  const sizeSel = document.getElementById('rte-image-size');
  if(sizeSel){
    sizeSel.addEventListener('change', ()=>{
      const img = getSelectedImage();
      if(!img) return;
      const v = sizeSel.value || '';
      if(v){ img.setAttribute('data-size', v); }
      else{ img.removeAttribute('data-size'); }
      // sync textarea
      const ed = document.getElementById('feature-body-editor');
      const ta = document.getElementById('feature-body');
      if(ed && ta){ ta.value = sanitizeHtml(ed.innerHTML); }
    });
  }
  // RTE: device image -> compress -> insert as data URL (note: may increase storage usage)
  const imgFileEl = document.getElementById('rte-image-file-input');
  if(imgFileEl){
    imgFileEl.addEventListener('change', async ()=>{
      const f = imgFileEl.files && imgFileEl.files[0];
      if(!f) return;
      try{
        const dataUrl = await compressImageFile(f, { maxSize: 1280, mime: 'image/webp', quality: 0.8 });
        document.execCommand('insertImage', false, dataUrl);
        // sync textarea after insertion
        const ed = document.getElementById('feature-body-editor');
        const ta = document.getElementById('feature-body');
        if(ed && ta){ ta.value = sanitizeHtml(ed.innerHTML); }
      }catch{
        const reader = new FileReader();
        reader.onload = ()=>{
          const dataUrl = String(reader.result || '');
          document.execCommand('insertImage', false, dataUrl);
          const ed = document.getElementById('feature-body-editor');
          const ta = document.getElementById('feature-body');
          if(ed && ta){ ta.value = sanitizeHtml(ed.innerHTML); }
        };
        reader.readAsDataURL(f);
      }finally{
        imgFileEl.value = '';
      }
    });
  }
  // Thumbnail preview live update
  const thumbInput = $('#feature-thumbnail');
  if(thumbInput){ thumbInput.addEventListener('input', ()=> updateThumbPreview(thumbInput.value)); }
  const fileInput = document.getElementById('feature-thumbnail-file');
  if(fileInput){
    fileInput.addEventListener('change', async ()=>{
      const f = fileInput.files && fileInput.files[0];
      if(!f) return;
      try{
        const dataUrl = await compressImageFile(f, { maxSize: 1280, mime: 'image/webp', quality: 0.8 });
        const th = document.getElementById('feature-thumbnail');
        if(th){ th.value = dataUrl; }
        updateThumbPreview(dataUrl);
      }catch{
        // fallback: original as data URL (may be large)
        const reader = new FileReader();
        reader.onload = ()=>{
          const dataUrl = String(reader.result || '');
          const th = document.getElementById('feature-thumbnail');
          if(th){ th.value = dataUrl; }
          updateThumbPreview(dataUrl);
        };
        reader.readAsDataURL(f);
      }
    });
  }
  renderTable();
  // Deep link: open editor if ?id=...
  const urlId = getParam('id');
  if(urlId){
    if(urlId === 'new'){ onNew(); showEditor(); }
    else { openEditorForId(urlId); }
  }else{ showList(); }
  // Back/forward navigation: respond to history changes
  window.addEventListener('popstate', ()=>{
    const pid = getParam('id');
    if(pid){
      if(pid === 'new'){ onNew(); showEditor(); }
      else { openEditorForId(pid); }
    }else{ showList(); }
  });
  // Modal close wiring
  const closeBtn = document.getElementById('feature-modal-close');
  if(closeBtn){ closeBtn.addEventListener('click', showList); }
  const bd = document.getElementById('feature-modal-backdrop');
  if(bd){ bd.addEventListener('click', showList); }
})();

// Fallback global handlers (in case event delegation is blocked by environment/CSS)
window.__featureEdit = function(id){ openEditorForId(id); };
window.__featureStatus = function(id){
  const list = loadFeatures();
  const idx = list.findIndex(f=> f.id === id);
  if(idx === -1) return;
  const cur = list[idx].status || 'draft';
  const next = cur === 'published' ? 'private' : (cur === 'private' ? 'draft' : 'published');
  list[idx].status = next;
  list[idx].updatedAt = new Date().toISOString();
  saveFeatures(list); renderTable();
};
window.__featureDelete = function(id){
  const list = loadFeatures();
  const idx = list.findIndex(f=> f.id === id);
  if(idx === -1) return;
  if(!confirm('この特集を削除しますか？')) return;
  list.splice(idx,1); saveFeatures(list); renderTable();
};
window.__featureCreate = function(){ onNew(); updateUrlForEdit('new'); showEditor(); };
window.__featureBack = function(){ showList(); };

// Simple sanitizer to allow limited tags/attrs suitable for SEO-friendly article markup
function sanitizeHtml(html){
  const allowedTags = new Set(['P','H2','H3','H4','UL','OL','LI','STRONG','EM','U','A','BLOCKQUOTE','IMG','BR','DIV','SECTION','FIGURE','SPAN']);
  const allowedAttrs = {
    'A': ['href','target','rel','class'],
    'IMG': ['src','alt','data-size','class','data-x','data-y','data-w','data-h'],
    'P': ['data-align','class'], 'H2': ['data-align','class'], 'H3': ['data-align','class'], 'H4': ['data-align','class'],
    'LI': ['data-align','class'], 'UL': ['data-align','class'], 'OL': ['data-align','class'], 'BLOCKQUOTE': ['data-align','class'],
    'DIV': ['data-align','class','data-x','data-y','data-w','data-h'],
    'SECTION': ['class','data-x','data-y','data-w','data-h'],
    'FIGURE': ['class','data-x','data-y','data-w','data-h'],
    'SPAN': ['class']
  };
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_ELEMENT, null);
  const toRemove = [];
  while(walker.nextNode()){
    const el = walker.currentNode;
    if(!allowedTags.has(el.tagName)){
      toRemove.push(el);
      continue;
    }
    // Clean attributes
    for(const attr of Array.from(el.attributes)){
      const ok = allowedAttrs[el.tagName] && allowedAttrs[el.tagName].includes(attr.name.toLowerCase());
      if(!ok){ el.removeAttribute(attr.name); }
    }
    if(el.tagName === 'A'){
      const href = el.getAttribute('href')||'';
      if(href && !/^https?:\/\//i.test(href) && !href.startsWith('#')){ el.removeAttribute('href'); }
      el.setAttribute('rel','noopener');
      el.setAttribute('target','_blank');
    }
  }
  for(const el of toRemove){
    const parent = el.parentNode;
    while(el.firstChild){ parent.insertBefore(el.firstChild, el); }
    parent.removeChild(el);
  }
  return tmp.innerHTML;
}

function showEditor(){
  const listSec = document.getElementById('features-list-section');
  const editSec = document.getElementById('feature-editor-section');
  if(listSec){ listSec.hidden = true; listSec.style.display = 'none'; }
  if(editSec){ editSec.hidden = false; editSec.style.display = ''; }
  // open modal
  const modal = document.getElementById('feature-modal');
  const bd = document.getElementById('feature-modal-backdrop');
  if(modal){ modal.hidden = false; requestAnimationFrame(()=> modal.classList.add('is-open')); }
  if(bd){ bd.hidden = false; requestAnimationFrame(()=> bd.classList.add('is-open')); }
  // Lock background scroll
  document.body.classList.add('modal-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function showList(){
  const listSec = document.getElementById('features-list-section');
  const editSec = document.getElementById('feature-editor-section');
  if(listSec){ listSec.hidden = false; listSec.style.display = ''; }
  if(editSec){ editSec.hidden = true; editSec.style.display = 'none'; }
  closeFeatureModal();
  // remove id param
  const url = new URL(location.href);
  url.searchParams.delete('id');
  history.replaceState({}, '', url);
  // Unlock background scroll
  document.body.classList.remove('modal-open');
}

function refreshToolbarState(){
  const ed = document.getElementById('feature-body-editor');
  const sel = window.getSelection();
  if(!ed || !sel || sel.rangeCount === 0){ return; }
  const state = {
    bold: false, italic: false, underline: false,
    ul: false, ol: false, blockquote: false,
    block: 'p'
  };
  try{
    state.bold = document.queryCommandState('bold');
    state.italic = document.queryCommandState('italic');
    state.underline = document.queryCommandState('underline');
    state.ul = document.queryCommandState('insertUnorderedList');
    state.ol = document.queryCommandState('insertOrderedList');
  }catch{}
  // determine block element
  let node = sel.anchorNode;
  if(node && node.nodeType === Node.TEXT_NODE){ node = node.parentNode; }
  let cur = node;
  while(cur && cur !== ed && cur.nodeType === Node.ELEMENT_NODE){
    const tag = cur.tagName;
    if(tag === 'BLOCKQUOTE'){ state.blockquote = true; }
    if(tag === 'H2' || tag === 'H3' || tag === 'H4' || tag === 'P'){
      state.block = tag.toLowerCase();
      break;
    }
    if(tag === 'LI'){
      // inside list: treat as paragraph for heading select
      state.block = 'p';
      break;
    }
    cur = cur.parentElement;
  }
  // Update heading select
  const selEl = document.getElementById('rte-heading');
  if(selEl){
    const want = (state.block === 'h2' || state.block === 'h3' || state.block === 'h4') ? state.block : 'p';
    if(selEl.value !== want){ selEl.value = want; }
  }
  // Toggle button active classes
  toggleActiveBtn('[data-cmd="bold"]', !!state.bold);
  toggleActiveBtn('[data-cmd="italic"]', !!state.italic);
  toggleActiveBtn('[data-cmd="underline"]', !!state.underline);
  toggleActiveBtn('[data-cmd="insertUnorderedList"]', !!state.ul);
  toggleActiveBtn('[data-cmd="insertOrderedList"]', !!state.ol);
  toggleActiveBtn('[data-cmd="formatBlock"][data-value="blockquote"]', !!state.blockquote);

  // Reflect image size if an IMG is selected
  const img = getSelectedImage();
  const sizeSel = document.getElementById('rte-image-size');
  if(sizeSel){ sizeSel.value = img?.getAttribute('data-size') || ''; }
}

function toggleActiveBtn(selector, on){
  const btn = document.querySelector('.rte-toolbar ' + selector);
  if(!btn) return;
  if(on){ btn.classList.add('is-active'); }
  else{ btn.classList.remove('is-active'); }
}

function getSelectedImage(){
  const ed = document.getElementById('feature-body-editor');
  const sel = window.getSelection();
  if(!ed || !sel || sel.rangeCount === 0) return null;
  let node = sel.anchorNode;
  if(node && node.nodeType === Node.TEXT_NODE){ node = node.parentNode; }
  let cur = node;
  while(cur && cur !== ed && cur.nodeType === Node.ELEMENT_NODE){
    if(cur.tagName === 'IMG') return cur;
    cur = cur.parentElement;
  }
  return null;
}

function getParam(name){
  try{ return new URL(location.href).searchParams.get(name); }catch{ return null; }
}
function updateUrlForEdit(id){
  const url = new URL(location.href);
  url.searchParams.set('id', id);
  history.pushState({ id }, '', url);
}
function updateThumbPreview(url){
  try{
    const img = document.getElementById('feature-thumbnail-preview');
    if(!img) return;
    if(url && (/^https?:\/\//i.test(url) || /^data:image\//i.test(url))){
      img.src = url; img.style.display = '';
    }else{
      img.removeAttribute('src'); img.style.display = 'none';
    }
  }catch{}
}
function openEditorForId(id){
  const list = loadFeatures();
  const item = list.find(f=> f.id === id);
  showEditor();
  if(!item){
    // Fallback: open blank editor if item not found
    onNew();
    updateUrlForEdit('new');
  }else{
    fillForm(item);
    updateUrlForEdit(id);
  }
}

function closeFeatureModal(){
  const modal = document.getElementById('feature-modal');
  const bd = document.getElementById('feature-modal-backdrop');
  if(modal){ modal.classList.remove('is-open'); }
  if(bd){ bd.classList.remove('is-open'); }
  setTimeout(()=>{
    if(modal) modal.hidden = true;
    if(bd) bd.hidden = true;
  }, 200);
}

// Export/Import helpers
function exportFeatures(){
  try{
    const data = loadFeatures();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g,'-');
    a.href = url; a.download = `features-backup-${ts}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const msg = document.getElementById('feature-message');
    if(msg) msg.textContent = 'エクスポートしました。';
  }catch{
    const msg = document.getElementById('feature-message');
    if(msg) msg.textContent = 'エクスポートに失敗しました。';
  }
}
async function importFeaturesFile(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  try{
    const text = await file.text();
    const arr = JSON.parse(text);
    if(!Array.isArray(arr)) throw new Error('Invalid JSON');
    // Merge: by id; keep latest updatedAt
    const current = loadFeatures();
    const map = new Map(current.map(x=> [x.id, x]));
    let added = 0, updated = 0, skipped = 0;
    for(const f of arr){
      if(!f || typeof f !== 'object'){ skipped++; continue; }
      if(!f.id) f.id = uuid();
      if(!f.createdAt) f.createdAt = new Date().toISOString();
      if(!f.updatedAt) f.updatedAt = f.createdAt;
      if(!f.status) f.status = 'draft';
      if(typeof f.thumbnail === 'undefined') f.thumbnail = '';
      const existed = map.get(f.id);
      if(!existed){ map.set(f.id, f); added++; }
      else{
        const isNewer = new Date(f.updatedAt).getTime() > new Date(existed.updatedAt).getTime();
        if(isNewer){ map.set(f.id, f); updated++; }
        else{ skipped++; }
      }
    }
    const merged = Array.from(map.values());
    try{ saveFeatures(merged); }catch(err){
      const msg = document.getElementById('feature-message');
      if(msg) msg.textContent = '保存容量を超えました。画像のサイズを小さくして再試行してください。';
      return;
    }
    renderTable();
    const msg = document.getElementById('feature-message');
    if(msg) msg.textContent = `インポートしました。追加:${added}件 / 更新:${updated}件 / スキップ:${skipped}件`;
  }catch{
    const msg = document.getElementById('feature-message');
    if(msg) msg.textContent = 'インポートに失敗しました。JSON形式を確認してください。';
  }finally{
    e.target.value = '';
  }
}

async function seedFromStatic(){
  try{
    const res = await fetch('/feature/feature-list.json');
    if(!res.ok) throw new Error(String(res.status));
    const arr = await res.json();
    const now = new Date().toISOString();
    const mapped = Array.isArray(arr) ? arr.map((x,i)=>({
      id: uuid(),
      title: x.title || `サンプル${i+1}`,
      summary: x.excerpt || '',
      body: '',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      thumbnail: (x.image||'').replace(/^\.\//,'/feature/')
    })) : [];
    const cur = loadFeatures();
    const merged = cur.concat(mapped);
    try{ saveFeatures(merged); }catch(err){
      const msg = document.getElementById('feature-message');
      if(msg) msg.textContent = '保存容量を超えました。画像サイズや件数を減らしてください。';
      return;
    }
    renderTable();
    const msg = document.getElementById('feature-message');
    if(msg) msg.textContent = 'サンプルを読み込みました。必要に応じて編集・公開してください。';
  }catch{
    const msg = document.getElementById('feature-message');
    if(msg) msg.textContent = 'サンプルの読み込みに失敗しました。';
  }
}

async function restoreRecommendedSet(){
  try{
    const [f1, f2] = await Promise.all([
      fetch('/feature/feature-list.json'),
      fetch('/data/articles.json')
    ]);
    const arr1 = (f1.ok ? await f1.json() : []);
    const arr2 = (f2.ok ? await f2.json() : []);
    const now = new Date().toISOString();
    const mapCard = (x,i)=>({
      id: uuid(), title: x.title || `特集${i+1}`,
      summary: x.excerpt || '', body: '',
      status: 'published', createdAt: now, updatedAt: now,
      thumbnail: (x.image||'').replace(/^\.\//,'/feature/')
    });
    const a = Array.isArray(arr1) ? arr1.map(mapCard) : [];
    const b = Array.isArray(arr2) ? arr2.map(mapCard) : [];
    const mergedNew = a.concat(b);
    const cur = loadFeatures();
    // Avoid duplicates by title
    const titles = new Set(cur.map(x=> x.title));
    const final = cur.concat(mergedNew.filter(x=> !titles.has(x.title)));
    try{ saveFeatures(final); }catch(err){
      const msg = document.getElementById('feature-message');
      if(msg) msg.textContent = '保存容量を超えました。画像サイズを小さくするか件数を減らしてください。';
      return;
    }
    renderTable();
    const msg = document.getElementById('feature-message');
    if(msg) msg.textContent = '推奨セットで復元しました。（公開）';
  }catch{
    const msg = document.getElementById('feature-message');
    if(msg) msg.textContent = '復元に失敗しました。';
  }
}

// Image compression utility for data URL thumbnails
async function compressImageFile(file, { maxSize = 1280, mime = 'image/webp', quality = 0.8 } = {}){
  const img = await new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = ()=>{ const i = new Image(); i.onload = ()=>res(i); i.onerror = rej; i.src = String(r.result||''); };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const w = img.width, h = img.height;
  let dw = w, dh = h;
  if(Math.max(w,h) > maxSize){
    if(w >= h){ dw = maxSize; dh = Math.round(h * (maxSize / w)); }
    else{ dh = maxSize; dw = Math.round(w * (maxSize / h)); }
  }
  const canvas = document.createElement('canvas');
  canvas.width = dw; canvas.height = dh;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, dw, dh);
  const out = canvas.toDataURL(mime, quality);
  return out;
}

// Normalize text alignment: move inline style text-align to data-align attributes on block elements
function normalizeAlignAttributes(root){
  try{
    const blocks = root.querySelectorAll('p,h2,h3,h4,li,ul,ol,blockquote,div');
    blocks.forEach(el =>{
      const styleAttr = el.getAttribute('style');
      if(!styleAttr) return;
      const style = styleAttr.toLowerCase();
      const m = style.match(/text-align:\s*(left|center|right)/);
      if(m){
        el.setAttribute('data-align', m[1]);
        // remove text-align from style while keeping other style declarations
        const cleaned = styleAttr.replace(/(^|;)\s*text-align\s*:\s*(left|center|right)\s*(;|$)/i, (all, p1, v, p3)=> (p1 && p1 !== ';'? p1: '') + (p3 && p3 !== ';'? p3: ''));
        if(cleaned.trim()){ el.setAttribute('style', cleaned); }
        else{ el.removeAttribute('style'); }
      }
    });
  }catch{}
}
