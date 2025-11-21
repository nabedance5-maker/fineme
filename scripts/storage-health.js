// storage-health.js: localStorage 使用量の概算と警告バナー表示 + クリーンアップUI
const STORAGE_HEALTH_KEY = 'glowup:storage-health:dismissed'; // セッション単位の非表示
const STORAGE_HEALTH_MUTED = 'glowup:storage-health:muted';   // 永続的な非表示（このブラウザ）

function estimateLocalStorageUsage(){
  try{
    let total = 0;
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      const v = localStorage.getItem(k);
      total += (k ? k.length : 0) + (v ? v.length : 0);
    }
    // 近似：UTF-16文字数を2バイト換算
    return total * 2; // bytes
  }catch{ return 0; }
}

function formatBytes(bytes){
  const KB = 1024, MB = KB*1024;
  if(bytes >= MB) return (bytes/MB).toFixed(1) + 'MB';
  if(bytes >= KB) return Math.round(bytes/KB) + 'KB';
  return bytes + 'B';
}

export function showStorageWarningIfNeeded(options){
  const opts = Object.assign({ thresholdBytes: 4*1024*1024 * 0.85 }, options||{}); // 4MBの85%
  try{
    if(sessionStorage.getItem(STORAGE_HEALTH_KEY)) return; // セッション中は再表示しない
    if(localStorage.getItem(STORAGE_HEALTH_MUTED) === '1') return; // 永続ミュート
  }catch{}
  if(document.getElementById('storage-health-banner')) return; // 重複表示回避
  const used = estimateLocalStorageUsage();
  if(used < opts.thresholdBytes) return;
  const remain = Math.max(0, 4*1024*1024 - used);

  const bar = document.createElement('div');
  bar.id = 'storage-health-banner';
  bar.setAttribute('role','status');
  bar.setAttribute('aria-live','polite');
  // build content via DOM APIs to avoid injecting HTML
  const textSpan = document.createElement('span');
  textSpan.className = 'storage-health-text';
  textSpan.textContent = `保存容量が残りわずかです（使用量: ${formatBytes(used)} / 残り: ${formatBytes(remain)}）。不要なデータを削除してください。`;
  const actions = document.createElement('div'); actions.className = 'storage-health-actions';
  const btnClean = document.createElement('button'); btnClean.id = 'storage-health-clean'; btnClean.className = 'storage-health-btn'; btnClean.textContent = '容量を整理';
  const btnDismiss = document.createElement('button'); btnDismiss.id = 'storage-health-dismiss'; btnDismiss.className = 'storage-health-dismiss'; btnDismiss.setAttribute('aria-label','このお知らせを閉じる'); btnDismiss.textContent = '閉じる';
  const btnMute = document.createElement('button'); btnMute.id = 'storage-health-mute'; btnMute.className = 'storage-health-mute'; btnMute.setAttribute('aria-label','今後表示しない（このブラウザ）'); btnMute.textContent = '今後表示しない';
  actions.appendChild(btnClean); actions.appendChild(btnDismiss); actions.appendChild(btnMute);
  bar.appendChild(textSpan); bar.appendChild(actions);
  const header = document.getElementById('site-header');
  const main = document.querySelector('main');
  if(header && header.parentNode){ header.parentNode.insertBefore(bar, main); }
  else document.body.insertBefore(bar, document.body.firstChild);
  const btn = document.getElementById('storage-health-dismiss');
  if(btn){ btn.addEventListener('click',()=>{ bar.remove(); try{ sessionStorage.setItem(STORAGE_HEALTH_KEY,'1'); }catch{} }); }
  const mute = document.getElementById('storage-health-mute');
  if(mute){ mute.addEventListener('click',()=>{ try{ localStorage.setItem(STORAGE_HEALTH_MUTED,'1'); }catch{} bar.remove(); }); }
  const clean = document.getElementById('storage-health-clean');
  if(clean){ clean.addEventListener('click', openCleanupModal); }

  injectStylesOnce();
}

// 追加: クリーンアップ用モーダル
function openCleanupModal(){
  const bd = document.createElement('div');
  bd.id = 'storage-cleanup-backdrop';
  bd.className = 'storage-modal-backdrop';
  const modal = document.createElement('div');
  modal.id = 'storage-cleanup-modal';
  modal.className = 'storage-modal';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  // populate modal content via DOM builder (returns content node)
  try{ modal.appendChild(renderCleanupModalInner()); }catch(e){ /* fallback: leave empty */ }
  document.body.appendChild(modal);
  requestAnimationFrame(()=>{ bd.classList.add('is-open'); modal.classList.add('is-open'); });
  wireCleanupModal(modal, bd);
}

function renderCleanupModalInner(){
  const data = listGlowupKeys();
  const total = data.reduce((a,b)=> a+b.size, 0);
  const container = document.createElement('div'); container.className = 'storage-modal-content';
  const header = document.createElement('div'); header.className = 'cluster'; header.style.justifyContent = 'space-between'; header.style.alignItems = 'center'; header.style.gap = '8px';
  const h3 = document.createElement('h3'); h3.style.margin = '0'; h3.textContent = '保存データの整理';
  const closeBtn = document.createElement('button'); closeBtn.className = 'btn-ghost'; closeBtn.id = 'storage-cleanup-close'; closeBtn.setAttribute('aria-label','閉じる'); closeBtn.textContent = '×';
  header.appendChild(h3); header.appendChild(closeBtn); container.appendChild(header);
  const p = document.createElement('p'); p.className = 'muted'; p.textContent = '不要なデータを削除して容量を空けられます。大容量になりやすいのは「サービス画像」「特集の本文画像（data URL）」「掲載者/スタッフ画像」です。'; container.appendChild(p);
  const card = document.createElement('div'); card.className = 'card'; card.style.padding = '0'; card.style.overflow = 'auto'; card.style.maxHeight = '50vh';
  const table = document.createElement('table'); table.className = 'table'; table.style.width = '100%';
  const thead = document.createElement('thead');
  const thr = document.createElement('tr');
  const th1 = document.createElement('th'); th1.textContent = 'キー';
  const th2 = document.createElement('th'); th2.style.textAlign = 'right'; th2.textContent = 'サイズ';
  const th3 = document.createElement('th'); th3.style.textAlign = 'right'; th3.textContent = '操作';
  thr.appendChild(th1); thr.appendChild(th2); thr.appendChild(th3); thead.appendChild(thr);
  table.appendChild(thead);
  const tbody = document.createElement('tbody'); tbody.id = 'storage-rows';
  if(data.length === 0){ const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 3; td.className = 'muted'; td.textContent = '対象データが見つかりません。'; tr.appendChild(td); tbody.appendChild(tr); }
  else{
    for(const d of data){
      const tr = document.createElement('tr');
      const warns = (/services|features|providers/.test(d.key) && /data:image\//.test(d.preview||'')) ? ' ⚠︎' : '';
      const td1 = document.createElement('td');
      const label = document.createElement('label'); label.className = 'cluster'; label.style.alignItems = 'center'; label.style.gap = '8px';
      const ck = document.createElement('input'); ck.type = 'checkbox'; ck.className = 'ck-del'; ck.setAttribute('data-key', d.key);
      const code = document.createElement('code'); code.textContent = d.key;
      label.appendChild(ck); label.appendChild(code); if(warns) label.appendChild(document.createTextNode(warns)); td1.appendChild(label);
      const td2 = document.createElement('td'); td2.style.textAlign = 'right'; td2.textContent = formatBytes(d.size);
      const td3 = document.createElement('td'); td3.className = 'cluster'; td3.style.justifyContent = 'flex-end'; td3.style.gap = '6px';
      const exp = document.createElement('button'); exp.className = 'btn-ghost sm btn-exp'; exp.setAttribute('data-key', d.key); exp.textContent = 'エクスポート';
      const del = document.createElement('button'); del.className = 'btn-ghost sm btn-del'; del.setAttribute('data-key', d.key); del.textContent = '削除';
      td3.appendChild(exp); td3.appendChild(del);
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tbody.appendChild(tr);
    }
  }
  table.appendChild(tbody); card.appendChild(table); container.appendChild(card);
  const footer = document.createElement('div'); footer.className = 'cluster'; footer.style.justifyContent = 'space-between'; footer.style.alignItems = 'center'; footer.style.gap = '8px'; footer.style.flexWrap = 'wrap';
  const totalDiv = document.createElement('div'); totalDiv.className = 'muted'; totalDiv.textContent = '合計: '; const totalStrong = document.createElement('strong'); totalStrong.textContent = formatBytes(total); totalDiv.appendChild(totalStrong);
  const right = document.createElement('div'); right.className = 'cluster'; right.style.gap = '8px'; right.style.flexWrap = 'wrap';
  const expAll = document.createElement('button'); expAll.id = 'storage-export-all'; expAll.className = 'btn'; expAll.textContent = '全データをエクスポート';
  const delSel = document.createElement('button'); delSel.id = 'storage-delete-selected'; delSel.className = 'btn danger'; delSel.textContent = '選択を削除';
  right.appendChild(expAll); right.appendChild(delSel);
  footer.appendChild(totalDiv); footer.appendChild(right); container.appendChild(footer);
  return container;
}

function wireCleanupModal(modal, bd){
  const close = ()=>{ modal.classList.remove('is-open'); bd.classList.remove('is-open'); setTimeout(()=>{ modal.remove(); bd.remove(); }, 150); };
  modal.querySelector('#storage-cleanup-close')?.addEventListener('click', close);
  bd.addEventListener('click', close);
  // per-row export/delete
  modal.addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const key = btn.getAttribute('data-key');
    if(btn.classList.contains('btn-exp') && key){ exportKey(key); }
    if(btn.classList.contains('btn-del') && key){ if(confirm(`「${key}」を削除しますか？`)){ localStorage.removeItem(key); refreshCleanupModal(modal); } }
  });
  // bulk actions
  modal.querySelector('#storage-export-all')?.addEventListener('click', exportAllGlowupData);
  modal.querySelector('#storage-delete-selected')?.addEventListener('click', ()=>{
    const checks = modal.querySelectorAll('.ck-del:checked');
    if(checks.length===0) return;
    if(!confirm(`${checks.length}件のデータを削除しますか？`)) return;
    checks.forEach(ch=>{ const k = ch.getAttribute('data-key'); if(k) localStorage.removeItem(k); });
    refreshCleanupModal(modal);
  });
}

function refreshCleanupModal(modal){
  const tbody = modal.querySelector('#storage-rows'); if(!tbody) return;
  const data = listGlowupKeys();
  // rebuild tbody rows safely
  tbody.innerHTML = ''; // clear
  for(const d of data){
    const tr = document.createElement('tr');
    const warns = (/services|features|providers/.test(d.key) && /data:image\//.test(d.preview||'')) ? ' ⚠︎' : '';
    const td1 = document.createElement('td');
    const label = document.createElement('label'); label.className = 'cluster'; label.style.alignItems = 'center'; label.style.gap = '8px';
    const ck = document.createElement('input'); ck.type = 'checkbox'; ck.className = 'ck-del'; ck.setAttribute('data-key', d.key);
    const code = document.createElement('code'); code.textContent = d.key; label.appendChild(ck); label.appendChild(code); if(warns) label.appendChild(document.createTextNode(warns)); td1.appendChild(label);
    const td2 = document.createElement('td'); td2.style.textAlign = 'right'; td2.textContent = formatBytes(d.size);
    const td3 = document.createElement('td'); td3.className = 'cluster'; td3.style.justifyContent = 'flex-end'; td3.style.gap = '6px';
    const exp = document.createElement('button'); exp.className = 'btn-ghost sm btn-exp'; exp.setAttribute('data-key', d.key); exp.textContent = 'エクスポート';
    const del = document.createElement('button'); del.className = 'btn-ghost sm btn-del'; del.setAttribute('data-key', d.key); del.textContent = '削除';
    td3.appendChild(exp); td3.appendChild(del);
    tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
    tbody.appendChild(tr);
  }
  // update total in footer area
  const total = data.reduce((a,b)=> a+b.size, 0);
  const info = modal.querySelector('.storage-modal-content .muted');
  if(info){
    // Replace innerHTML with safe DOM construction
    info.textContent = '合計: ';
    const strong = document.createElement('strong'); strong.textContent = formatBytes(total);
    info.appendChild(strong);
  }
  // バナーも必要に応じて更新/閉じる
  const banner = document.getElementById('storage-health-banner');
  if(banner){
    const used = estimateLocalStorageUsage();
    const remain = Math.max(0, 4*1024*1024 - used);
    const txt = banner.querySelector('.storage-health-text');
    if(txt){ txt.textContent = `保存容量が残りわずかです（使用量: ${formatBytes(used)} / 残り: ${formatBytes(remain)}）。不要なデータを削除してください。`; }
    // 閾値を下回ったら自動で閉じる
    if(used < 4*1024*1024 * 0.85){ banner.remove(); }
  }
}

function listGlowupKeys(){
  const out = [];
  try{
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i) || '';
      if(!/^glowup:/i.test(k)) continue;
      const v = localStorage.getItem(k) || '';
      const size = (k.length + v.length) * 2;
      out.push({ key: k, size, preview: v.slice(0, 64) });
    }
  }catch{}
  // サイズ降順
  out.sort((a,b)=> b.size - a.size);
  return out;
}

function exportKey(key){
  try{
    const raw = localStorage.getItem(key);
    if(raw==null){ alert('データが見つかりません。'); return; }
    downloadBlob(raw, `${key.replace(/[:]/g,'-')}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  }catch{ alert('エクスポートに失敗しました。'); }
}

function exportAllGlowupData(){
  const data = {};
  try{
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i) || '';
      if(!/^glowup:/i.test(k)) continue;
      data[k] = safeParse(localStorage.getItem(k));
    }
    downloadBlob(JSON.stringify(data, null, 2), `glowup-backup-all-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
  }catch{ alert('エクスポートに失敗しました。'); }
}

function safeParse(text){
  try{ return JSON.parse(text||'null'); }catch{ return text; }
}

function downloadBlob(content, filename, type='application/json'){
  try{
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
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

function injectStylesOnce(){
  if(document.getElementById('storage-health-styles')) return;
  const s = document.createElement('style');
  s.id = 'storage-health-styles';
  s.textContent = `
  #storage-health-banner{position:relative;display:flex;gap:12px;align-items:center;justify-content:space-between;padding:10px 12px;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;margin:0}
  #storage-health-banner .storage-health-actions{display:flex;gap:8px;align-items:center}
  #storage-health-banner .storage-health-btn{padding:6px 10px;border:1px solid #f97316;background:#ffedd5;color:#9a3412;border-radius:6px;cursor:pointer}
  #storage-health-banner .storage-health-dismiss{padding:6px 10px;border:1px solid #fecaca;background:#fee2e2;color:#7f1d1d;border-radius:6px;cursor:pointer}
  #storage-health-banner .storage-health-mute{padding:6px 10px;border:1px solid #c7d2fe;background:#eef2ff;color:#3730a3;border-radius:6px;cursor:pointer}
  /* modal */
  .storage-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);z-index:999;opacity:0;transition:opacity .15s ease}
  .storage-modal-backdrop.is-open{opacity:1}
  .storage-modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;z-index:1000;opacity:0;transform:translateY(6px) scale(.98);transition:opacity .15s ease, transform .15s ease}
  .storage-modal.is-open{opacity:1;transform:none}
  .storage-modal-content{background:#fff;border:1px solid var(--color-border,#e5e7eb);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.15);padding:16px;max-width:840px;width:100%;max-height:80vh;overflow:auto}
  .btn-ghost{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:6px 10px;cursor:pointer}
  .btn-ghost.sm{padding:4px 8px;font-size:12px}
  .btn{background:#111827;color:#fff;border:1px solid #111827;border-radius:8px;padding:8px 12px;cursor:pointer}
  .btn.danger{background:#b91c1c;border-color:#b91c1c}
  .muted{color:#6b7280}
  code{background:#f3f4f6;padding:2px 4px;border-radius:4px}
  `;
  document.head.appendChild(s);
}
