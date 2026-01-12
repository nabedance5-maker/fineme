// Provider side: booking requests management (localStorage demo)
export {};
import { addNotification } from './notifications.js';
const REQUESTS_KEY = 'glowup:requests';
const SERVICES_KEY = 'glowup:services';
const SLOTS_KEY = 'glowup:slots';
const PROVIDER_SESSION_KEY = 'glowup:providerSession';

function $(s,root=document){return root.querySelector(s);} 
function loadRequests(){ try{ const raw=localStorage.getItem(REQUESTS_KEY); const arr=raw?JSON.parse(raw):[]; return Array.isArray(arr)?arr:[]; }catch{ return []; } }
function saveRequests(list){
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(list));
  try{
    const cb = document.getElementById('requests-auto-export');
    if(cb && cb instanceof HTMLInputElement && cb.checked){
      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `requests-backup-${ts}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
  }catch{}
}
function loadServices(){ try{ const raw=localStorage.getItem(SERVICES_KEY); const arr=raw?JSON.parse(raw):[]; return Array.isArray(arr)?arr:[]; }catch{ return []; } }
function loadSlots(){ try{ const raw=localStorage.getItem(SLOTS_KEY); const arr=raw?JSON.parse(raw):[]; return Array.isArray(arr)?arr:[]; }catch{ return []; } }
function saveSlots(list){ localStorage.setItem(SLOTS_KEY, JSON.stringify(list)); }
function getSession(){ try{ const raw=sessionStorage.getItem(PROVIDER_SESSION_KEY); return raw?JSON.parse(raw):null; }catch{ return null; } }

function serviceName(id){ const s = loadServices().find(x=> x.id===id); return s? s.name : '不明'; }

function createStatusBadge(status){
  const span = document.createElement('span'); span.className = 'badge';
  if(status === 'pending'){ span.textContent = '未処理'; }
  else if(status === 'approved'){ span.className = 'badge success'; span.textContent = '承認'; }
  else if(status === 'rejected'){ span.className = 'badge muted'; span.textContent = '却下'; }
  else { span.textContent = String(status || ''); }
  return span;
}

function toStartDateTime(req){
  // date: YYYY-MM-DD, start: HH:mm (assume local time)
  try{ return new Date(`${req.date}T${(req.start||'00:00')}:00`); }catch{ return null; }
}

function sweepExpiredRequests(){
  // Mark pending requests as expired if start time is passed
  const now = new Date();
  const list = loadRequests();
  let changed = 0;
  for(const r of list){
    if(r.status === 'pending'){
      const d = toStartDateTime(r);
      if(d && d.getTime() <= now.getTime()){
        r.status = 'expired';
        r.autoCanceledAt = new Date().toISOString();
        changed++;
      }
    }
  }
  if(changed){ saveRequests(list); }
  return changed;
}

function renderList(){
  const session = getSession(); if(!session) return;
  const tbody = $('#req-tbody'); if(!tbody) return;
  // auto-cancel pending requests past start time
  const expiredCount = sweepExpiredRequests();
  const filter = $('#req-filter')?.value || 'pending';
  const all = loadRequests().filter(r=> r.providerId === session.id);
  const list = (filter==='pending') ? all.filter(r=> r.status==='pending') : all;
    tbody.textContent = '';
    if(!list || list.length === 0){ const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 9; td.className = 'muted'; td.textContent = '予約リクエストはありません。'; tr.appendChild(td); tbody.appendChild(tr); const m=$('#req-message'); if(expiredCount&&m) m.textContent=`${expiredCount}件のリクエストを開始時刻経過のため自動キャンセルしました。`; return; }
    for(const r of list.sort((a,b)=> b.createdAt.localeCompare(a.createdAt))){
      const tr = document.createElement('tr');
      const tdId = document.createElement('td'); tdId.textContent = String(r.id || ''); tr.appendChild(tdId);
      const tdUser = document.createElement('td'); tdUser.textContent = String(r.userName || ''); tr.appendChild(tdUser);
      const tdSvc = document.createElement('td'); tdSvc.textContent = String(r.serviceName || ''); tr.appendChild(tdSvc);
      const tdStatus = document.createElement('td'); tdStatus.appendChild(createStatusBadge(r.status)); tr.appendChild(tdStatus);
      const tdDate = document.createElement('td'); tdDate.textContent = String(r.date || ''); tr.appendChild(tdDate);
      const tdAct = document.createElement('td');
      const btnAccept = document.createElement('button'); btnAccept.className = 'btn btn-ghost'; btnAccept.setAttribute('data-action','approve'); btnAccept.setAttribute('data-id', r.id); btnAccept.textContent = '承認';
      const btnReject = document.createElement('button'); btnReject.className = 'btn btn-ghost'; btnReject.setAttribute('data-action','reject'); btnReject.setAttribute('data-id', r.id); btnReject.textContent = '却下';
      tdAct.appendChild(btnAccept); tdAct.appendChild(btnReject); tr.appendChild(tdAct);
      tbody.appendChild(tr);
    }
  const m = $('#req-message'); if(expiredCount && m){ m.textContent = `${expiredCount}件のリクエストを開始時刻経過のため自動キャンセルしました。`; }
}

// decision modal helpers
function openDecisionModal({ id, action, summary }){
  const bd = $('#decision-backdrop'); const modal = $('#decision-modal');
  $('#decision-title').textContent = action === 'approve' ? '承認' : '辞退';
  $('#decision-summary').textContent = summary || '';
  const confirmBtn = $('#decision-confirm');
  confirmBtn.setAttribute('data-id', id);
  confirmBtn.setAttribute('data-action', action);
  $('#decision-comment').value = '';
  if(bd){ bd.hidden = false; requestAnimationFrame(()=> bd.classList.add('is-open')); }
  if(modal){ modal.hidden = false; requestAnimationFrame(()=> modal.classList.add('is-open')); }
}
function closeDecisionModal(){
  const bd = $('#decision-backdrop'); const modal = $('#decision-modal');
  if(bd) bd.classList.remove('is-open');
  if(modal) modal.classList.remove('is-open');
  setTimeout(()=>{ if(bd) bd.hidden = true; if(modal) modal.hidden = true; }, 180);
}

function onTableClick(e){
  const btn = e.target.closest('button[data-action]'); if(!btn) return;
  const id = btn.getAttribute('data-id'); const act = btn.getAttribute('data-action');
  const session = getSession(); if(!session) return;
  const reqs = loadRequests(); const idx = reqs.findIndex(r=> r.id===id && r.providerId===session.id); if(idx===-1) return;
  if(act==='approve' || act==='reject' || act==='cancel'){
    const r = reqs[idx];
    const title = act==='approve' ? '承認' : act==='reject' ? '辞退' : 'キャンセル';
    {
      const timeStr = r.end ? `${r.start}-${r.end}` : `${r.start}`;
      openDecisionModal({ id, action: act, summary: `${r.date} ${timeStr} / ${serviceName(r.serviceId)} / ${r.userName} 様` });
    }
    const t = document.getElementById('decision-title'); if(t) t.textContent = title;
  }
}

function escapeHtml(str){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

(function init(){
  const filter = document.getElementById('req-filter'); if(filter){ filter.addEventListener('change', renderList); }
  const tbody = document.getElementById('req-tbody'); if(tbody){ tbody.addEventListener('click', onTableClick); }
  // Import wiring
  const importInput = document.getElementById('requests-import-input');
  if(importInput){ importInput.addEventListener('change', importRequestsFile); }
  const closeBtn = document.getElementById('decision-close'); if(closeBtn){ closeBtn.addEventListener('click', closeDecisionModal); }
  const cancelBtn = document.getElementById('decision-cancel'); if(cancelBtn){ cancelBtn.addEventListener('click', closeDecisionModal); }
  const confirmBtn = document.getElementById('decision-confirm'); if(confirmBtn){ confirmBtn.addEventListener('click', ()=>{
    const action = confirmBtn.getAttribute('data-action');
    const id = confirmBtn.getAttribute('data-id');
    const comment = ($('#decision-comment')?.value || '').toString();
    const session = getSession(); if(!session) return;
    const reqs = loadRequests(); const idx = reqs.findIndex(r=> r.id===id && r.providerId===session.id); if(idx===-1) return;
    if(action === 'approve'){
      reqs[idx].status = 'approved';
      reqs[idx].providerComment = comment;
      const slots = loadSlots();
      const sidx = slots.findIndex(s=> s.id===reqs[idx].slotId && s.providerId===session.id);
      if(sidx!==-1){ slots[sidx].open = false; saveSlots(slots); }
      saveRequests(reqs);
      // Notify user of approval (local notifications)
      try{
        const r = reqs[idx];
        const title = '予約が承認されました';
        const timeStr = r.end ? `${r.start}-${r.end}` : `${r.start}`;
        const body = `${r.serviceName || serviceName(r.serviceId)} / ${r.date} ${timeStr} の予約が承認されました。詳細をご確認ください。`;
        addNotification({ toType:'user', toId: r.userId || null, title, body, data:{ requestId: r.id } });
      }catch(e){ console.warn('notify user approval failed', e); }
      const msg = $('#req-message'); if(msg) msg.textContent = 'リクエストを承認しました。該当枠を受付停止にしました。';
    } else if(action === 'reject'){
      reqs[idx].status = 'rejected';
      reqs[idx].providerComment = comment;
      saveRequests(reqs);
      // Notify user of rejection
      try{
        const r = reqs[idx];
        const title = '予約が辞退されました';
        const timeStr = r.end ? `${r.start}-${r.end}` : `${r.start}`;
        const body = `${r.serviceName || serviceName(r.serviceId)} / ${r.date} ${timeStr} の予約が辞退されました。別の枠・サービスをご検討ください。`;
        addNotification({ toType:'user', toId: r.userId || null, title, body, data:{ requestId: r.id } });
      }catch(e){ console.warn('notify user rejection failed', e); }
      const msg = $('#req-message'); if(msg) msg.textContent = 'リクエストを辞退しました。';
    } else if(action === 'cancel'){
      // Allow provider to cancel approved (and pending) reservations if before start time
      const r = reqs[idx];
      const start = toStartDateTime(r);
      const now = new Date();
      if(start && now.getTime() >= start.getTime()){
        const msg = $('#req-message'); if(msg) msg.textContent = '開始時刻を過ぎたためキャンセルできません。';
        closeDecisionModal();
        return;
      }
      const wasApproved = r.status === 'approved';
      r.status = 'cancelled';
      r.providerComment = comment;
      r.providerCanceledAt = new Date().toISOString();
      saveRequests(reqs);
      // Notify user of cancellation
      try{
        const title = '予約がキャンセルされました';
        const timeStr = r.end ? `${r.start}-${r.end}` : `${r.start}`;
        let body = `${r.serviceName || serviceName(r.serviceId)} / ${r.date} ${timeStr} の予約がキャンセルされました。`;
        if(comment){ body += ` 理由: ${escapeHtml(comment)}`; }
        addNotification({ toType:'user', toId: r.userId || null, title, body, data:{ requestId: r.id } });
      }catch(e){ console.warn('notify user cancel failed', e); }
      if(wasApproved){
        const slots = loadSlots();
        const sidx = slots.findIndex(s=> s.id===r.slotId && s.providerId===session.id);
        if(sidx!==-1){ slots[sidx].open = true; saveSlots(slots); }
      }
      const msg = $('#req-message'); if(msg) msg.textContent = '予約をキャンセルしました。';
    }
    closeDecisionModal();
    renderList();
  }); }
  renderList();
  // auto export toggle default OFF
  try{
    const key = 'glowup:requests:autoExport';
    const cb = document.getElementById('requests-auto-export');
    if(cb && cb instanceof HTMLInputElement){
      const saved = localStorage.getItem(key);
      if(saved === null){ cb.checked = false; localStorage.setItem(key, '0'); }
      else{ cb.checked = saved === '1'; }
      cb.addEventListener('change', ()=> localStorage.setItem(key, cb.checked ? '1':'0'));
    }
  }catch{}
})();

// Import with merge for booking requests
async function importRequestsFile(e){
  const input = e.target;
  const file = (input && input instanceof HTMLInputElement && input.files) ? input.files[0] : null;
  if(!file) return;
  const session = getSession(); if(!session){ alert('セッションが切れています。再ログインしてください。'); if(input) input.value=''; return; }
  try{
    const text = await file.text();
    const arr = JSON.parse(text);
    if(!Array.isArray(arr)) throw new Error('invalid');
    const current = loadRequests();
    const byId = new Map(current.map(r=> [r.id, r]));
    let added=0, updated=0, skipped=0;
    for(const r of arr){
      if(!r || typeof r !== 'object'){ skipped++; continue; }
      // 自分の予約（providerId一致）に限定
      const providerId = r.providerId || session.id;
      if(providerId !== session.id){ skipped++; continue; }
      // 必須項目の簡易チェック
      if(!r.serviceId || !r.date || !r.start || !r.end || !r.userName || !r.contact){ skipped++; continue; }
      if(r.id && byId.has(r.id)){
        const idx = current.findIndex(x=> x.id === r.id);
        if(idx !== -1){
          const existed = current[idx];
          // 既存の確定状態（approved/cancelled/expired/rejected）を上書きしない簡易ポリシー
          const terminal = new Set(['approved','cancelled','expired','rejected']);
          const nextStatus = String(r.status||'pending');
          const keepStatus = terminal.has(String(existed.status||'')) && !terminal.has(nextStatus);
          current[idx] = {
            ...existed,
            ...r,
            id: existed.id,
            providerId: session.id,
            status: keepStatus ? existed.status : nextStatus
          };
          updated++;
        }else{ skipped++; }
      }else{
        // 新規作成
        const item = {
          id: r.id || (Math.random().toString(36).slice(2) + Date.now().toString(36)),
          providerId: session.id,
          serviceId: r.serviceId,
          slotId: r.slotId || '',
          date: r.date,
          start: r.start,
          end: r.end,
          userName: r.userName,
          contact: r.contact,
          note: r.note || '',
          providerComment: r.providerComment || '',
          status: String(r.status||'pending'),
          createdAt: r.createdAt || new Date().toISOString()
        };
        current.push(item); added++;
      }
    }
    saveRequests(current);
    renderList();
    alert(`インポートしました。追加:${added}件 / 更新:${updated}件 / スキップ:${skipped}件`);
  }catch{
    alert('インポートに失敗しました。JSON形式をご確認ください。');
  }finally{
    const input2 = document.getElementById('requests-import-input');
    if(input2 && input2 instanceof HTMLInputElement){ input2.value=''; }
  }
}
