// Admin Providers Management: create/list/delete provider accounts in localStorage
// Data model (localStorage key: 'glowup:providers')
// Provider: { id, name, loginId, passwordHash, createdAt, profile?: { storeName, address, businessHours, access, phone, website, description } }

function $(s, root=document){ return root.querySelector(s); }
function $all(s, root=document){ return Array.from(root.querySelectorAll(s)); }
const STORAGE_KEY = 'glowup:providers';
function resolvePrefix(){ return location.pathname.includes('/pages/') ? '..' : '.'; }

// Plan options metadata
const PLAN_OPTIONS = {
  p5000: { id:'p5000', price:5000, feeRate:0.08, label:'5,000円プラン（予約手数料8％）' },
  p7000: { id:'p7000', price:7000, feeRate:0.07, label:'7,000円プラン（予約手数料7％）' },
  p10000:{ id:'p10000', price:10000, feeRate:0.06, label:'10,000円プラン（予約手数料6％）' }
};
function planLabel(p){ try{ if(!p) return ''; const meta = PLAN_OPTIONS[p.id] || PLAN_OPTIONS[p]; return meta ? meta.label : ''; }catch{ return ''; } }

function loadProviders(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch{
    return [];
  }
}

function saveProviders(list){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  // auto export if enabled
  try{
    const auto = document.getElementById('providers-auto-export');
    if(auto && auto instanceof HTMLInputElement && auto.checked){
      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      downloadBlob(JSON.stringify(list, null, 2), `providers-backup-${ts}.json`);
    }
  }catch{}
}

function uuid(){
  // Simple uuid v4-ish
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

function renderTable(){
  const tbody = $('#providers-table-body');
  if(!tbody) return;
  const list = loadProviders();
  // clear safely
  tbody.textContent = '';
  for(const p of list){
    const tr = document.createElement('tr');
    const tdName = document.createElement('td'); tdName.textContent = p.name || '';
    const tdStore = document.createElement('td'); tdStore.textContent = p.profile?.storeName || '';
    const tdLogin = document.createElement('td'); tdLogin.textContent = p.loginId || '';
    const tdPlan = document.createElement('td'); tdPlan.textContent = planLabel(p.plan) || '—';
    const tdCreated = document.createElement('td'); tdCreated.textContent = new Date(p.createdAt).toLocaleString();
    const tdOps = document.createElement('td'); tdOps.className = 'cluster';
    const btnProfile = document.createElement('button'); btnProfile.className = 'btn btn-ghost'; btnProfile.setAttribute('data-action','profile'); btnProfile.setAttribute('data-id', p.id); btnProfile.textContent = 'プロフィール編集';
    const btnReset = document.createElement('button'); btnReset.className = 'btn btn-ghost'; btnReset.setAttribute('data-action','reset'); btnReset.setAttribute('data-id', p.id); btnReset.textContent = '初期化(パス)';
    const btnDelete = document.createElement('button'); btnDelete.className = 'btn btn-ghost danger'; btnDelete.setAttribute('data-action','delete'); btnDelete.setAttribute('data-id', p.id); btnDelete.textContent = '削除';
    tdOps.appendChild(btnProfile); tdOps.appendChild(btnReset); tdOps.appendChild(btnDelete);
    tr.appendChild(tdName); tr.appendChild(tdStore); tr.appendChild(tdLogin); tr.appendChild(tdPlan); tr.appendChild(tdCreated); tr.appendChild(tdOps);
    tbody.appendChild(tr);
  }
}

function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}

function onCreateSubmit(e){
  e.preventDefault();
  const form = e.currentTarget;
  const msg = $('#provider-create-message');
  const fd = new FormData(form);
  const name = (fd.get('name')||'').toString().trim();
  const loginId = (fd.get('loginId')||'').toString().trim();
  const password = (fd.get('password')||'').toString();

  if(!name || !loginId || !password){
    if(msg) msg.textContent = '必須項目が未入力です。';
    return;
  }
  // simple uniqueness check
  const list = loadProviders();
  if(list.some(p=> p.loginId.toLowerCase() === loginId.toLowerCase())){
    if(msg) msg.textContent = 'そのログインIDは既に使用されています。';
    return;
  }
  const provider = {
    id: uuid(),
    name,
    loginId,
    passwordHash: password, // demo only; do NOT store plain text in production
    createdAt: new Date().toISOString(),
    // default plan at account creation
    plan: { id:'p7000', price:7000, feeRate:0.07 }
  };
  list.push(provider);
  saveProviders(list);
  form.reset();
  if(msg) msg.textContent = 'アカウントを作成しました。';
  renderTable();
}

function onTableClick(e){
  const btn = e.target.closest('button[data-action]');
  if(!btn) return;
  const id = btn.getAttribute('data-id');
  const action = btn.getAttribute('data-action');
  const list = loadProviders();
  const idx = list.findIndex(p=> p.id === id);
  if(idx === -1) return;
  if(action === 'delete'){
    if(!confirm('この掲載者アカウントを削除しますか？')) return;
    list.splice(idx,1);
    saveProviders(list);
    renderTable();
  }else if(action === 'reset'){
    const newPass = prompt('新しいパスワードを入力してください（4文字以上）');
    if(!newPass || newPass.length < 4) return alert('4文字以上のパスワードを入力してください。');
    list[idx].passwordHash = newPass;
    saveProviders(list);
    alert('パスワードを更新しました。');
  }else if(action === 'profile'){
    openProfileModal(list[idx]);
  }
}

// Profile modal handling
function openProfileModal(provider){
  // fill form
  $('#profile-provider-id').value = provider.id;
  $('#profile-name').value = provider.name || '';
  // Backward compatibility: if profile empty but stores exist, migrate first store to profile
  if((!provider.profile || !provider.profile.storeName) && Array.isArray(provider.stores) && provider.stores.length){
    const s = provider.stores[0];
    provider.profile = provider.profile || {};
    provider.profile.storeName = provider.profile.storeName || s.storeName || '';
    provider.profile.address = provider.profile.address || s.address || '';
    provider.profile.businessHours = provider.profile.businessHours || s.businessHours || '';
    provider.profile.phone = provider.profile.phone || s.phone || '';
    provider.profile.website = provider.profile.website || s.website || '';
    // persist migration
    const list = loadProviders();
    const idx = list.findIndex(p=> p.id === provider.id);
    if(idx !== -1){ list[idx] = provider; saveProviders(list); }
  }
  // Load single-store profile fields
  $('#profile-storeName').value = provider.profile?.storeName || '';
  $('#profile-address').value = provider.profile?.address || '';
  $('#profile-businessHours').value = provider.profile?.businessHours || '';
  $('#profile-phone').value = provider.profile?.phone || '';
  $('#profile-website').value = provider.profile?.website || '';
  $('#profile-description').value = provider.profile?.description || '';
  // Load diagnosis-linked tags (C/D, priceTier, expertise)
  try{
    const scores = (provider.onboarding && provider.onboarding.scores) ? provider.onboarding.scores : {};
    const cEl = document.getElementById('profile-change-range');
    const dEl = document.getElementById('profile-pace');
    if(cEl && cEl instanceof HTMLSelectElement){ const C = Number(scores?.C||0); cEl.value = (C>=1 && C<=4) ? String(C) : '3'; }
    if(dEl && dEl instanceof HTMLSelectElement){ const D = Number(scores?.D||0); dEl.value = (D>=1 && D<=3) ? String(D) : '2'; }
    const tierEl = document.getElementById('profile-priceTier'); if(tierEl && tierEl instanceof HTMLSelectElement){ tierEl.value = provider.profile?.priceTier || 'mid'; }
    const expHost = document.getElementById('profile-expertise'); if(expHost){ const arr = Array.isArray(provider.profile?.expertise) ? provider.profile.expertise : []; Array.from(expHost.querySelectorAll('input[type=checkbox]')).forEach(el=>{ if(el instanceof HTMLInputElement){ el.checked = arr.includes(el.value); } }); }
  }catch{}
  // plan selection
  try{
    const sel = /** @type {HTMLSelectElement} */ (document.getElementById('profile-planId'));
    if(sel){
      const cur = (provider.plan && provider.plan.id) ? provider.plan.id : 'p7000';
      sel.value = PLAN_OPTIONS[cur] ? cur : 'p7000';
    }
  }catch{}

  const modal = document.getElementById('provider-profile-modal');
  const bd = document.getElementById('provider-profile-modal-backdrop');
  if(modal){ modal.hidden = false; requestAnimationFrame(()=> modal.classList.add('is-open')); }
  if(bd){ bd.hidden = false; requestAnimationFrame(()=> bd.classList.add('is-open')); }
}
function closeProfileModal(){
  const modal = document.getElementById('provider-profile-modal');
  const bd = document.getElementById('provider-profile-modal-backdrop');
  if(modal){ modal.classList.remove('is-open'); }
  if(bd){ bd.classList.remove('is-open'); }
  setTimeout(()=>{
    if(modal) modal.hidden = true;
    if(bd) bd.hidden = true;
  }, 200);
}

function onProfileSubmit(e){
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const providerId = (fd.get('providerId')||'').toString();
  const list = loadProviders();
  const idx = list.findIndex(p=> p.id === providerId);
  if(idx === -1) return;
  // update fields
  list[idx].name = (fd.get('name')||'').toString().trim() || list[idx].name;
  // Save single-store profile fields
  list[idx].profile = {
    ...(list[idx].profile||{}),
    storeName: (fd.get('storeName')||'').toString().trim(),
    address: (fd.get('address')||'').toString().trim(),
    businessHours: (fd.get('businessHours')||'').toString().trim(),
    phone: (fd.get('phone')||'').toString().trim(),
    website: (fd.get('website')||'').toString().trim(),
    description: (fd.get('description')||'').toString()
  };
  // Save onboarding scores (C/D) and profile priceTier/expertise
  try{
    const C = Number((fd.get('changeRange')||'').toString()) || 3;
    const D = Number((fd.get('pace')||'').toString()) || 2;
    list[idx].onboarding = { ...(list[idx].onboarding||{}), scores: { ...(list[idx].onboarding?.scores||{}), C, D } };
    list[idx].profile.priceTier = (fd.get('priceTier')||'mid').toString();
    const expHost = document.getElementById('profile-expertise');
    list[idx].profile.expertise = (function(){ if(!expHost) return []; return Array.from(expHost.querySelectorAll('input[type=checkbox]')).map(el=> el instanceof HTMLInputElement ? el : null).filter(Boolean).filter(c=> c.checked).map(c=> c.value); })();
  }catch{}
  // Save plan selection
  try{
    const planId = (fd.get('planId')||'').toString() || 'p7000';
    const meta = PLAN_OPTIONS[planId] || PLAN_OPTIONS.p7000;
    list[idx].plan = { id: meta.id, price: meta.price, feeRate: meta.feeRate };
  }catch{}
  saveProviders(list);
  $('#provider-profile-message').textContent = '保存しました。';
  renderTable();
  closeProfileModal();
}

// Helper: render store rows inside #profile-stores
function renderProfileStores(stores){
  const host = document.getElementById('profile-stores');
  if(!host) return;
  host.textContent = '';
  stores.forEach((st, i)=>{
    const id = st.id || uuid();
    const row = document.createElement('div');
    row.className = 'profile-store-row';
    row.dataset.storeId = id;
    const card = document.createElement('div'); card.style.border = '1px solid var(--color-border)'; card.style.padding = '8px'; card.style.borderRadius = '8px'; card.style.marginBottom = '8px';
    const cluster = document.createElement('div'); cluster.className = 'cluster'; cluster.style.gap = '8px';
    const labelName = document.createElement('label'); labelName.style.flex = '1'; labelName.textContent = '店舗名';
    const inputName = document.createElement('input'); inputName.name = 'storeName'; inputName.value = st.storeName || '';
    labelName.appendChild(inputName);
    const labelPhone = document.createElement('label'); labelPhone.style.flex = '1'; labelPhone.textContent = '電話';
    const inputPhone = document.createElement('input'); inputPhone.name = 'phone'; inputPhone.value = st.phone || '';
    labelPhone.appendChild(inputPhone);
    cluster.appendChild(labelName); cluster.appendChild(labelPhone);
    card.appendChild(cluster);
    const labelAddr = document.createElement('label'); labelAddr.textContent = '住所'; const inputAddr = document.createElement('input'); inputAddr.name = 'address'; inputAddr.value = st.address || ''; labelAddr.appendChild(inputAddr); card.appendChild(labelAddr);
    const cluster2 = document.createElement('div'); cluster2.className = 'cluster'; cluster2.style.marginTop = '8px';
    const labelBH = document.createElement('label'); labelBH.style.flex = '1'; labelBH.textContent = '営業時間'; const inputBH = document.createElement('input'); inputBH.name = 'businessHours'; inputBH.value = st.businessHours || ''; labelBH.appendChild(inputBH);
    const labelWeb = document.createElement('label'); labelWeb.style.flex = '1'; labelWeb.textContent = 'Webサイト'; const inputWeb = document.createElement('input'); inputWeb.name = 'website'; inputWeb.value = st.website || ''; labelWeb.appendChild(inputWeb);
    cluster2.appendChild(labelBH); cluster2.appendChild(labelWeb); card.appendChild(cluster2);
    const ops = document.createElement('div'); ops.style.textAlign = 'right'; ops.style.marginTop = '6px'; const btnRemove = document.createElement('button'); btnRemove.type = 'button'; btnRemove.className = 'btn btn-ghost profile-store-remove'; btnRemove.textContent = '削除'; ops.appendChild(btnRemove); card.appendChild(ops);
    row.appendChild(card);
    host.appendChild(row);
  });
  // attach remove handlers
  host.querySelectorAll('.profile-store-remove').forEach(btn=> btn.addEventListener('click', (e)=>{
    const t = e.target;
    const r = (t instanceof Element) ? t.closest('.profile-store-row') : null;
    if(r && r instanceof Element) r.remove();
  }));
}

// Helper: collect store rows into array
function collectProfileStores(){
  const host = document.getElementById('profile-stores');
  if(!host) return [];
  const rows = Array.from(host.querySelectorAll('.profile-store-row'));
  return rows.map(r=>{
  if(!(r instanceof Element)) return null;
  const hr = /** @type {HTMLElement} */ (r);
  const id = (hr.dataset && hr.dataset.storeId) ? hr.dataset.storeId : uuid();
    const q = (sel) => { const el = r.querySelector(sel); return (el && el instanceof HTMLInputElement) ? (el.value||'') : ''; };
    return {
      id,
      storeName: q('input[name="storeName"]').toString().trim(),
      phone: q('input[name="phone"]').toString().trim(),
      address: q('input[name="address"]').toString().trim(),
      businessHours: q('input[name="businessHours"]').toString().trim(),
      website: q('input[name="website"]').toString().trim()
    };
  }).filter(Boolean).filter(s=> s.storeName || s.address || s.phone || s.website);
}

(function init(){
  const form = document.getElementById('provider-create-form');
  const tbody = document.getElementById('providers-table-body');
  if(form){ form.addEventListener('submit', onCreateSubmit); }
  if(tbody){ tbody.addEventListener('click', onTableClick); }
  // profile modal wiring
  const profForm = document.getElementById('provider-profile-form');
  if(profForm){ profForm.addEventListener('submit', onProfileSubmit); }
  const profClose = document.getElementById('provider-profile-close');
  if(profClose){ profClose.addEventListener('click', closeProfileModal); }
  const bd = document.getElementById('provider-profile-modal-backdrop');
  if(bd){ bd.addEventListener('click', closeProfileModal); }
  const profCancel = document.getElementById('provider-profile-cancel');
  if(profCancel){ profCancel.addEventListener('click', closeProfileModal); }
  // multi-store controls removed: provider has a single store (managed via profile fields)

  // Export/Import/Seed/Restore wiring
  const btnExport = document.getElementById('providers-export');
  if(btnExport){ btnExport.addEventListener('click', exportProviders); }
  const importInput = document.getElementById('providers-import-input');
  if(importInput){ importInput.addEventListener('change', importProvidersFile); }
  const seedBtn = document.getElementById('providers-seed');
  if(seedBtn){ seedBtn.addEventListener('click', seedProvidersFromStatic); }
  const restoreBtn = document.getElementById('providers-restore');
  if(restoreBtn){ restoreBtn.addEventListener('click', restoreRecommendedProviders); }
  const restoreByLoginBtn = document.getElementById('providers-restore-by-login-btn');
  if(restoreByLoginBtn){ restoreByLoginBtn.addEventListener('click', restoreProviderByLoginId); }
  // persist toggle state in localStorage for UX continuity (default OFF)
  try{
    const key = 'glowup:providers:autoExport';
    const cb = document.getElementById('providers-auto-export');
    if(cb && cb instanceof HTMLInputElement){
      const saved = localStorage.getItem(key);
      if(saved === null){
        cb.checked = false; // default OFF
        localStorage.setItem(key, '0');
      }else{
        cb.checked = saved === '1';
      }
      cb.addEventListener('change', ()=> localStorage.setItem(key, cb.checked ? '1':'0'));
    }
  }catch{}
  renderTable();
})();

// ===== Backup / Restore =====
function downloadBlob(content, filename, type='application/json'){
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}

function exportProviders(){
  try{
    const list = loadProviders();
    downloadBlob(JSON.stringify(list, null, 2), `providers-export-${new Date().toISOString().slice(0,10)}.json`);
  }catch(err){ alert('エクスポートに失敗しました。'); }
}

async function fetchJsonWithFallback(relPath){
  const rel = `${resolvePrefix()}${relPath}`;
  try{
    const res = await fetch(rel, { cache:'no-store' });
    if(!res.ok) throw new Error(String(res.status));
    return await res.json();
  }catch(e){
    try{
      const res2 = await fetch(relPath, { cache:'no-store' });
      if(!res2.ok) throw new Error(String(res2.status));
      return await res2.json();
    }catch(e2){ console.warn('Failed to load', relPath, e2); return null; }
  }
}

async function seedProvidersFromStatic(){
  const data = await fetchJsonWithFallback('/scripts/data/providers.json');
  if(!Array.isArray(data)) return alert('サンプルデータの読み込みに失敗しました。');
  try{
    const cur = loadProviders();
    saveProviders([...cur, ...data]);
    alert('サンプルデータを読み込みました。');
    renderTable();
  }catch(err){ alert('保存に失敗しました（容量超過の可能性があります）。'); }
}

function importProvidersFile(e){
  const input = e.currentTarget;
  const file = input.files && input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(String(reader.result||'[]'));
      if(!Array.isArray(data)) throw new Error('invalid');
      const current = loadProviders();
      const byLogin = new Map(current.map(p=> [String(p.loginId||'').toLowerCase(), p]));
      let added=0, updated=0, skipped=0;
      for(const p of data){
        if(!p || typeof p !== 'object') { skipped++; continue; }
        const key = String(p.loginId||'').toLowerCase();
        if(!key){ skipped++; continue; }
        const existed = byLogin.get(key);
        if(!existed){
          // 追加
          const item = { ...p };
          if(!item.id) item.id = uuid();
          if(!item.createdAt) item.createdAt = new Date().toISOString();
          current.push(item); byLogin.set(key, item); added++;
        }else{
          // 更新: createdAtは維持、idも維持
          const merged = { ...existed, ...p, id: existed.id, createdAt: existed.createdAt };
          const idx = current.findIndex(x=> x.id === existed.id);
          if(idx !== -1){ current[idx] = merged; updated++; }
        }
      }
      saveProviders(current);
      alert(`インポートしました。追加:${added}件 / 更新:${updated}件 / スキップ:${skipped}件`);
      renderTable();
    }catch(err){ alert('インポートに失敗しました。JSON形式をご確認ください。'); }
  };
  reader.readAsText(file);
  // reset input to allow re-selecting same file
  input.value = '';
}

async function restoreRecommendedProviders(){
  if(!confirm('掲載者データを推奨セットで上書き復元します。よろしいですか？')) return;
  const data = await fetchJsonWithFallback('/scripts/data/providers.json');
  if(!Array.isArray(data)) return alert('復元データの読み込みに失敗しました。');
  try{
    saveProviders(data);
    alert('推奨セットで復元しました。');
    renderTable();
  }catch(err){ alert('保存に失敗しました。'); }
}

async function restoreProviderByLoginId(){
  const input = document.getElementById('providers-restore-by-login');
  const loginId = (input && input instanceof HTMLInputElement ? input.value : '').trim();
  if(!loginId) return alert('ログインIDを入力してください。');
  const data = await fetchJsonWithFallback('/scripts/data/providers.json');
  if(!Array.isArray(data)) return alert('復元データの読み込みに失敗しました。');
  const target = data.find(p=> (p.loginId||'').toLowerCase() === loginId.toLowerCase());
  if(!target) return alert('一致するログインIDが見つかりませんでした。');
  const list = loadProviders();
  const idx = list.findIndex(p=> (p.loginId||'').toLowerCase() === loginId.toLowerCase());
  if(idx === -1){
    list.push(target);
  }else{
    list[idx] = target; // 全置換
  }
  try{
    saveProviders(list);
    alert(`アカウントを復元しました: ${loginId}`);
    renderTable();
  }catch(err){ alert('保存に失敗しました。'); }
}
