// Provider schedule management (localStorage demo)
export {};
const SERVICES_KEY = 'glowup:services';
const PROVIDER_SESSION_KEY = 'glowup:providerSession';
const SLOTS_KEY = 'glowup:slots'; // Array<{id, providerId, serviceId, date: 'YYYY-MM-DD', start: 'HH:mm', end:'HH:mm', cap:number, open?: boolean}>

function $(s, root=document){ return root.querySelector(s); }
function getSession(){ try{ const raw = sessionStorage.getItem(PROVIDER_SESSION_KEY); return raw? JSON.parse(raw): null; }catch{ return null; } }
function loadServices(){ try{ const raw = localStorage.getItem(SERVICES_KEY); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr:[]; }catch{ return []; } }
function loadSlots(){ try{ const raw = localStorage.getItem(SLOTS_KEY); const arr = raw? JSON.parse(raw):[]; return Array.isArray(arr)? arr:[]; }catch{ return []; } }
function saveSlots(list){
  localStorage.setItem(SLOTS_KEY, JSON.stringify(list));
  try{
    const cb = document.getElementById('slots-auto-export');
    if(cb && cb instanceof HTMLInputElement && cb.checked){
      const ts = new Date().toISOString().replace(/[:.]/g,'-');
      const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `slots-backup-${ts}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
  }catch{}
}
function uuid(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16);}); }

// Calendar state
let viewYear, viewMonth; // month is 0-11
let viewDate; // for week/day
let calView = 'month'; // 'month' | 'week' | 'day'
const TEMPLATES_KEY = 'glowup:slotTemplates';
function pad2(n){ return String(n).padStart(2,'0'); }
function fmtDate(y,m,d){ return `${y}-${pad2(m+1)}-${pad2(d)}`; }
function startOfMonth(date){ return new Date(date.getFullYear(), date.getMonth(), 1); }
function endOfMonth(date){ return new Date(date.getFullYear(), date.getMonth()+1, 0); }

function startOfWeek(d){ const x = new Date(d); x.setDate(x.getDate()-x.getDay()); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }

function renderCalendar(){
  const container = $('#calendar');
  const title = $('#cal-title');
  const session = getSession();
  if(!container || !title || !session){ return; }

  const weekLabels = ['日','月','火','水','木','金','土'];
  // build calendar grid using DOM APIs to avoid injecting HTML strings
  container.textContent = '';
  if(calView === 'month'){
    const first = new Date(viewYear, viewMonth, 1);
    const last = endOfMonth(first);
    title.textContent = `${viewYear}年 ${viewMonth+1}月`;
    const startWeekday = first.getDay(); // 0 Sun
    const days = last.getDate();
    const grid = document.createElement('div'); grid.className = 'cal-grid';
    // headers
    for(const w of weekLabels){ const h = document.createElement('div'); h.className = 'cal-cell cal-head'; h.textContent = w; grid.appendChild(h); }
    // empty leading cells
    for(let i=0;i<startWeekday;i++){ const e = document.createElement('div'); e.className = 'cal-cell cal-empty'; grid.appendChild(e); }
    for(let d=1; d<=days; d++){
      const dateStr = fmtDate(viewYear, viewMonth, d);
      const count = (loadSlots().filter(s=> s.providerId===session.id && s.date===dateStr)).length;
      const btn = document.createElement('button'); btn.className = 'cal-cell cal-day'; btn.setAttribute('data-date', dateStr);
      const spanDate = document.createElement('span'); spanDate.className = 'cal-date'; spanDate.textContent = String(d);
      btn.appendChild(spanDate);
      if(count){ const badge = document.createElement('span'); badge.className = 'cal-badge'; badge.textContent = String(count); btn.appendChild(badge); }
      grid.appendChild(btn);
    }
    container.appendChild(grid);
  } else if(calView === 'week'){
    const ws = startOfWeek(viewDate || new Date());
    const we = addDays(ws, 6);
    title.textContent = `${ws.getFullYear()}年 ${ws.getMonth()+1}月 ${ws.getDate()}日 〜 ${we.getMonth()+1}月 ${we.getDate()}日`;
    const grid = document.createElement('div'); grid.className = 'cal-grid';
    for(const w of weekLabels){ const h = document.createElement('div'); h.className = 'cal-cell cal-head'; h.textContent = w; grid.appendChild(h); }
    for(let i=0;i<7;i++){
      const d = addDays(ws, i);
      const ds = d.toISOString().slice(0,10);
      const count = (loadSlots().filter(s=> s.providerId===session.id && s.date===ds)).length;
      const btn = document.createElement('button'); btn.className = 'cal-cell cal-day'; btn.setAttribute('data-date', ds);
      const spanDate = document.createElement('span'); spanDate.className = 'cal-date'; spanDate.textContent = String(d.getDate()); btn.appendChild(spanDate);
      if(count){ const badge = document.createElement('span'); badge.className = 'cal-badge'; badge.textContent = String(count); btn.appendChild(badge); }
      grid.appendChild(btn);
    }
    container.appendChild(grid);
  } else {
    const d = viewDate || new Date();
    title.textContent = `${d.getFullYear()}年 ${d.getMonth()+1}月 ${d.getDate()}日（${['日','月','火','水','木','金','土'][d.getDay()]}）`;
    const card = document.createElement('div'); card.className = 'card'; card.style.padding = '12px';
    const strong = document.createElement('strong'); strong.textContent = `選択日: `;
    card.appendChild(document.createTextNode('選択日: '));
    const s = document.createElement('strong'); s.textContent = (viewDate || new Date()).toISOString().slice(0,10);
    card.appendChild(s);
    container.appendChild(card);
  }

  container.addEventListener('click', onCalendarClick);
}

function onCalendarClick(e){
  const btn = e.target.closest('.cal-day');
  if(!btn) return;
  const date = btn.getAttribute('data-date');
  const input = $('#selected-date');
  if(input){ input.value = date; }
  renderSlotsList();
}

function renderServiceOptions(){
  const session = getSession();
  const sel = $('#service-select');
  if(!sel || !session) return;
  const services = loadServices().filter(s=> s.providerId === session.id);
  if(services.length === 0){
    sel.textContent = '';
    const opt = document.createElement('option'); opt.value = ''; opt.textContent = '（サービス未登録）'; sel.appendChild(opt);
    sel.disabled = true;
    // Informative messages to guide provider to create a service first
    const m1 = $('#slot-msg'); if(m1) m1.textContent = '対象サービスがありません。先に「サービス」ページでサービスを作成してください。';
    const m2 = $('#bulk-msg'); if(m2) m2.textContent = '対象サービスがありません。先に「サービス」ページでサービスを作成してください。';
  }else{
  sel.disabled = false;
  sel.textContent = '';
  const allOpt = document.createElement('option'); allOpt.value = ''; allOpt.textContent = 'すべて'; sel.appendChild(allOpt);
  for(const svc of services){ const o = document.createElement('option'); o.value = svc.id; o.textContent = svc.name || ''; sel.appendChild(o); }
    // Auto-select first service to reduce validation friction
    const firstId = services[0]?.id || '';
    sel.value = firstId;
    // Clear previous warnings if any
    const m1 = $('#slot-msg'); if(m1) m1.textContent = '';
    const m2 = $('#bulk-msg'); if(m2) m2.textContent = '';
  }
}

function renderSlotsList(){
  const session = getSession();
  const date = $('#selected-date')?.value;
  const list = $('#slots-list');
  const selSvc = $('#service-select')?.value;
  if(!session || !date || !list) return;
  const all = loadSlots().filter(s=> s.providerId === session.id && s.date === date && (!selSvc || s.serviceId === selSvc));
  if(all.length === 0){ list.textContent = ''; const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'この日の枠はありません。'; list.appendChild(p); return; }
  const sorted = all.sort((a,b)=> a.start.localeCompare(b.start));
  // Build action bar + slots list using DOM APIs
  list.textContent = '';
  const actionBar = document.createElement('div'); actionBar.className = 'cluster'; actionBar.style.justifyContent = 'space-between'; actionBar.style.alignItems = 'center';
  const left = document.createElement('div'); left.className = 'cluster'; left.style.gap = '8px';
  const label = document.createElement('label'); label.className = 'cluster'; label.style.gap = '6px';
  const selAll = document.createElement('input'); selAll.type = 'checkbox'; selAll.id = 'sel-all'; label.appendChild(selAll); label.appendChild(document.createTextNode(' 全選択'));
  left.appendChild(label);
  const selCount = document.createElement('span'); selCount.className = 'muted'; selCount.id = 'sel-count'; selCount.textContent = '0件選択'; left.appendChild(selCount);
  actionBar.appendChild(left);
  const right = document.createElement('div'); right.className = 'cluster'; right.style.gap = '8px'; right.style.flexWrap = 'wrap';
  const btnStop = document.createElement('button'); btnStop.className = 'btn btn-ghost'; btnStop.id = 'bulk-stop'; btnStop.textContent = '選択を受付停止';
  const btnOpen = document.createElement('button'); btnOpen.className = 'btn btn-ghost'; btnOpen.id = 'bulk-open'; btnOpen.textContent = '選択を受付再開';
  const btnDelete = document.createElement('button'); btnDelete.className = 'btn danger'; btnDelete.id = 'bulk-delete'; btnDelete.textContent = '選択を削除';
  right.appendChild(btnStop); right.appendChild(btnOpen); right.appendChild(btnDelete);
  actionBar.appendChild(right);
  list.appendChild(actionBar);
  for(const s of sorted){
    const open = (typeof s.open === 'undefined') ? true : !!s.open;
    const row = document.createElement('div'); row.className = 'cluster slot-item ' + (open ? '' : 'is-closed'); row.style.justifyContent = 'space-between';
    const leftc = document.createElement('div'); leftc.className = 'cluster'; leftc.style.gap = '8px'; leftc.style.alignItems = 'center';
    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.className = 'slot-check'; chk.setAttribute('data-id', s.id);
    const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = `${s.start} - ${s.end}`;
    const capSpan = document.createElement('span'); capSpan.className = 'muted'; capSpan.textContent = `定員 ${s.cap}`;
    const svcSpan = document.createElement('span'); svcSpan.className = 'muted'; svcSpan.textContent = `サービス: ${serviceName(s.serviceId)}`;
    leftc.appendChild(chk); leftc.appendChild(badge); leftc.appendChild(capSpan); leftc.appendChild(svcSpan);
    if(!open){ const closed = document.createElement('span'); closed.className = 'slot-badge-closed'; closed.textContent = '受付停止'; leftc.appendChild(closed); }
    const rightc = document.createElement('div'); rightc.className = 'cluster'; rightc.style.gap = '8px';
    const delBtn = document.createElement('button'); delBtn.className = 'btn btn-ghost'; delBtn.setAttribute('data-action','delete'); delBtn.setAttribute('data-id', s.id); delBtn.textContent = '削除';
    rightc.appendChild(delBtn);
    row.appendChild(leftc); row.appendChild(rightc);
    list.appendChild(row);
  }

  const updateCount = ()=>{
    const checks = list.querySelectorAll('.slot-check:checked');
    const cnt = checks.length; const el = list.querySelector('#sel-count'); if(el) el.textContent = `${cnt}件選択`;
    const selAll = list.querySelector('#sel-all'); if(selAll){ selAll.checked = cnt>0 && cnt === list.querySelectorAll('.slot-check').length; }
  };

  list.addEventListener('change', (e)=>{
    if(e.target && e.target.id === 'sel-all'){
      const on = e.target.checked; list.querySelectorAll('.slot-check').forEach(ch=> ch.checked = on);
      updateCount();
    }
    if(e.target && e.target.classList.contains('slot-check')){ updateCount(); }
  });

  list.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    const allSlots = loadSlots();
    if(btn.id === 'bulk-delete' || btn.getAttribute('data-action')==='delete'){
      const ids = btn.id === 'bulk-delete' ? Array.from(list.querySelectorAll('.slot-check:checked')).map(x=> x.getAttribute('data-id')) : [btn.getAttribute('data-id')];
      if(ids.length===0) return;
      let changed = false;
      for(const id of ids){ const idx = allSlots.findIndex(x=> x.id === id); if(idx!==-1){ allSlots.splice(idx,1); changed = true; } }
      if(changed){ saveSlots(allSlots); renderSlotsList(); renderCalendar(); }
    } else if(btn.id === 'bulk-stop' || btn.id === 'bulk-open'){
      const ids = Array.from(list.querySelectorAll('.slot-check:checked')).map(x=> x.getAttribute('data-id'));
      if(ids.length===0) return;
      const toOpen = (btn.id === 'bulk-open');
      let changed = false;
      for(const id of ids){ const s = allSlots.find(x=> x.id === id); if(s){ if(typeof s.open==='undefined' ? !toOpen : s.open !== toOpen){ s.open = toOpen; changed = true; } } }
      if(changed){ saveSlots(allSlots); renderSlotsList(); renderCalendar(); }
    }
  });
  updateCount();
}

function serviceName(id){
  const s = loadServices().find(x=> x.id === id);
  return s? s.name : '未指定';
}

function addSingleSlot(){
  const session = getSession();
  const date = $('#selected-date')?.value;
  const start = $('#slot-start')?.value;
  const end = $('#slot-end')?.value;
  const cap = Number($('#slot-cap')?.value || 1);
  const svcId = $('#service-select')?.value || '';
  const msg = $('#slot-msg');
  if(!session){ if(msg) msg.textContent = 'セッションが切れています。再ログインしてください。'; return; }
  if(!svcId){ if(msg) msg.textContent = '対象サービスを選択してください（サービスが未登録の場合は、先に「サービス」ページで作成が必要です）。'; return; }
  if(!date){ if(msg) msg.textContent = '日付を選択してください。'; return; }
  if(!start || !end){ if(msg) msg.textContent = '開始・終了時刻を入力してください。'; return; }
  if(end <= start){ if(msg) msg.textContent = '終了は開始より後にしてください。'; return; }

  const all = loadSlots();
  all.push({ id: uuid(), providerId: session.id, serviceId: svcId, date, start, end, cap: isNaN(cap)?1:cap, open: true });
  saveSlots(all);
  if(msg) msg.textContent = '枠を追加しました。';
  renderSlotsList();
  renderCalendar();
}

function bulkGenerate(){
  const session = getSession();
  const from = $('#bulk-from')?.value; const to = $('#bulk-to')?.value;
  const which = $('#bulk-days')?.value || 'weekdays';
  const start = $('#bulk-start')?.value || '10:00';
  const end = $('#bulk-end')?.value || '19:00';
  const interval = Number($('#bulk-interval')?.value || 60);
  const cap = Number($('#bulk-cap')?.value || 1);
  const svcId = $('#service-select')?.value || '';
  const msg = $('#bulk-msg');
  if(!session){ if(msg) msg.textContent = 'セッションが切れています。再ログインしてください。'; return; }
  if(!svcId){ if(msg) msg.textContent = '対象サービスを選択してください（サービスが未登録の場合は、先に「サービス」ページで作成が必要です）。'; return; }
  if(!from || !to){ if(msg) msg.textContent = '開始日と終了日を入力してください。'; return; }
  if(end <= start){ if(msg) msg.textContent = '終了は開始より後にしてください。'; return; }
  if(isNaN(interval) || interval <= 0){ if(msg) msg.textContent = '間隔を正しく入力してください。'; return; }

  const fromD = new Date(from); const toD = new Date(to);
  if(toD < fromD){ if(msg) msg.textContent = '終了日は開始日以降にしてください。'; return; }

  const all = loadSlots();
  for(let d=new Date(fromD); d<=toD; d.setDate(d.getDate()+1)){
    const dow = d.getDay();
    const isWeekend = (dow===0 || dow===6);
    if(which==='weekdays' && isWeekend) continue;
    if(which==='weekends' && !isWeekend) continue;
    // iterate time range
    let cur = start;
    while(cur < end){
      const next = addMinutes(cur, interval);
      if(next > end) break;
      all.push({ id: uuid(), providerId: session.id, serviceId: svcId, date: d.toISOString().slice(0,10), start: cur, end: next, cap: isNaN(cap)?1:cap, open: true });
      cur = next;
    }
  }
  saveSlots(all);
  if(msg) msg.textContent = '一括生成しました。';
  renderSlotsList();
  renderCalendar();
}

function addMinutes(hhmm, minutes){
  const [h,m] = hhmm.split(':').map(Number);
  const base = new Date(2000,0,1,h,m,0);
  const out = new Date(base.getTime() + minutes*60000);
  return `${pad2(out.getHours())}:${pad2(out.getMinutes())}`;
}

(function init(){
  const session = getSession();
  if(!session){ return; }
  const now = new Date(); viewYear = now.getFullYear(); viewMonth = now.getMonth(); viewDate = new Date(now);
  $('#prev-month')?.addEventListener('click', ()=>{
    if(calView==='month'){ if(--viewMonth<0){viewMonth=11;viewYear--;} }
    else if(calView==='week'){ viewDate = addDays(viewDate, -7); $('#selected-date').value = viewDate.toISOString().slice(0,10); renderSlotsList(); }
    else { viewDate = addDays(viewDate, -1); $('#selected-date').value = viewDate.toISOString().slice(0,10); renderSlotsList(); }
    renderCalendar();
  });
  $('#next-month')?.addEventListener('click', ()=>{
    if(calView==='month'){ if(++viewMonth>11){viewMonth=0;viewYear++;} }
    else if(calView==='week'){ viewDate = addDays(viewDate, 7); $('#selected-date').value = viewDate.toISOString().slice(0,10); renderSlotsList(); }
    else { viewDate = addDays(viewDate, 1); $('#selected-date').value = viewDate.toISOString().slice(0,10); renderSlotsList(); }
    renderCalendar();
  });
  $('#today-btn')?.addEventListener('click', ()=>{ const n=new Date(); viewYear=n.getFullYear(); viewMonth=n.getMonth(); viewDate = new Date(n); $('#selected-date').value = n.toISOString().slice(0,10); renderCalendar(); renderSlotsList(); });
  // view toggles
  function setView(v){ calView=v; ['#view-month','#view-week','#view-day'].forEach(sel=>{ const b=$(sel); if(b){ const on = (sel==='#view-'+v); b.setAttribute('aria-pressed', on?'true':'false'); } }); renderCalendar(); }
  $('#view-month')?.addEventListener('click', ()=> setView('month'));
  $('#view-week')?.addEventListener('click', ()=> setView('week'));
  $('#view-day')?.addEventListener('click', ()=> setView('day'));
  setView('month');
  $('#add-slot')?.addEventListener('click', addSingleSlot);
  $('#bulk-generate')?.addEventListener('click', bulkGenerate);
  $('#service-select')?.addEventListener('change', renderSlotsList);
  // Import wiring
  const importInput = document.getElementById('slots-import-input');
  if(importInput){ importInput.addEventListener('change', importSlotsFile); }

  renderServiceOptions();
  renderCalendar();
  $('#selected-date').value = new Date().toISOString().slice(0,10);
  renderSlotsList();
  // auto export toggle default OFF
  try{
    const key = 'glowup:slots:autoExport';
    const cb = document.getElementById('slots-auto-export');
    if(cb && cb instanceof HTMLInputElement){
      const saved = localStorage.getItem(key);
      if(saved === null){ cb.checked = false; localStorage.setItem(key, '0'); }
      else{ cb.checked = saved === '1'; }
      cb.addEventListener('change', ()=> localStorage.setItem(key, cb.checked ? '1':'0'));
    }
  }catch{}
})();

// Minimal calendar styles injected here to keep scope local to this feature
const style = document.createElement('style');
style.textContent = `
.calendar { --gap: 6px; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: var(--gap); }
.cal-cell { padding: 10px; background: #fff; border: 1px solid #eee; border-radius: 8px; text-align: left; }
.cal-head { background: #f8fafc; font-weight: 600; text-align: center; }
.cal-empty { background: transparent; border: none; }
.cal-day { cursor: pointer; position: relative; transition: transform .12s ease, box-shadow .12s ease; }
.cal-day:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(0,0,0,0.06); }
.cal-date { font-weight: 600; }
.cal-badge { position: absolute; right: 8px; bottom: 8px; background: #eef2ff; color: #4338ca; border-radius: 999px; padding: 2px 8px; font-size: 12px; }
/* slots list */
.slot-item.is-closed { opacity: .75; }
.slot-badge-closed { background: #fee2e2; color: #b91c1c; border-radius: 999px; padding: 2px 8px; font-size: 12px; }
`;
document.head.appendChild(style);

// --- Templates (save/apply/delete) ---
function loadTemplates(){ try{ const raw = localStorage.getItem(TEMPLATES_KEY); const arr = raw? JSON.parse(raw): []; return Array.isArray(arr)? arr: []; }catch{ return []; } }
function saveTemplates(arr){ localStorage.setItem(TEMPLATES_KEY, JSON.stringify(arr)); }
function refreshTemplateSelect(){
  const sel = $('#tpl-select'); if(!sel) return;
  const list = loadTemplates();
  // build options safely via DOM
  sel.textContent = '';
  if(!list || list.length === 0){ const opt = document.createElement('option'); opt.value = ''; opt.textContent = '（テンプレ無し）'; sel.appendChild(opt); return; }
  for(let i=0;i<list.length;i++){
    const t = list[i]; const opt = document.createElement('option'); opt.value = String(i); opt.textContent = `${t.name||'(無題)'}（${(t.items && t.items.length) ? t.items.length : 0}件）`; sel.appendChild(opt);
  }
}

function collectDaySlotsForTemplate(){
  const session = getSession(); const date = $('#selected-date')?.value; const svcId = $('#service-select')?.value || '';
  if(!session || !date || !svcId) return [];
  const all = loadSlots().filter(s=> s.providerId===session.id && s.date===date && s.serviceId===svcId);
  return all.map(s=> ({ start:s.start, end:s.end, cap:s.cap }));
}
function applyTemplateToDate(tpl, targetDate){
  const session = getSession(); const svcId = $('#service-select')?.value || '';
  if(!session || !svcId) return { added:0 };
  const all = loadSlots();
  let added=0;
  for(const it of (tpl.items||[])){
    all.push({ id: uuid(), providerId: session.id, serviceId: svcId, date: targetDate, start: it.start, end: it.end, cap: Number(it.cap)||1, open: true });
    added++;
  }
  saveSlots(all);
  return { added };
}

// wire template UI events after DOM loaded in init
(function tplInit(){
  document.addEventListener('DOMContentLoaded', ()=>{
    const saveBtn = $('#tpl-save'); const applyBtn = $('#tpl-apply'); const delBtn = $('#tpl-delete'); const nameInput = $('#tpl-name'); const msg = $('#tpl-msg');
    if(saveBtn){ saveBtn.addEventListener('click', ()=>{
      const items = collectDaySlotsForTemplate(); if(items.length===0){ if(msg) msg.textContent='この日に枠がありません。'; return; }
      const name = (nameInput?.value||'').trim() || 'テンプレ';
      const list = loadTemplates(); list.push({ name, items }); saveTemplates(list); refreshTemplateSelect(); if(msg) msg.textContent='テンプレートを保存しました。';
    }); }
    if(applyBtn){ applyBtn.addEventListener('click', ()=>{
      const sel = $('#tpl-select'); const idx = sel? Number(sel.value) : NaN; const date = $('#selected-date')?.value;
      if(isNaN(idx)){ if(msg) msg.textContent='テンプレートを選択してください。'; return; }
      if(!date){ if(msg) msg.textContent='適用する日付を選択してください。'; return; }
      const list = loadTemplates(); const tpl = list[idx]; if(!tpl){ if(msg) msg.textContent='テンプレートが見つかりません。'; return; }
      const { added } = applyTemplateToDate(tpl, date); renderSlotsList(); renderCalendar(); if(msg) msg.textContent = `${added}件の枠を追加しました。`;
    }); }
    if(delBtn){ delBtn.addEventListener('click', ()=>{
      const sel = $('#tpl-select'); const idx = sel? Number(sel.value) : NaN; if(isNaN(idx)){ if(msg) msg.textContent='削除するテンプレートを選択してください。'; return; }
      const list = loadTemplates(); if(idx<0 || idx>=list.length){ if(msg) msg.textContent='テンプレートが見つかりません。'; return; }
      list.splice(idx,1); saveTemplates(list); refreshTemplateSelect(); if(msg) msg.textContent='テンプレートを削除しました。';
    }); }
    refreshTemplateSelect();
  });
})();

// Import with merge for slots
async function importSlotsFile(e){
  const input = e.target;
  const file = (input && input instanceof HTMLInputElement && input.files) ? input.files[0] : null;
  if(!file) return;
  const session = getSession();
  if(!session){ alert('セッションが切れています。再ログインしてください。'); if(input) input.value=''; return; }
  try{
    const text = await file.text();
    const arr = JSON.parse(text);
    if(!Array.isArray(arr)) throw new Error('invalid');
    const current = loadSlots();
    const byId = new Map(current.map(s=> [s.id, s]));
    let added=0, updated=0, skipped=0;
    for(const s of arr){
      if(!s || typeof s !== 'object'){ skipped++; continue; }
      const providerId = s.providerId || session.id;
      if(providerId !== session.id){ skipped++; continue; }
      const date = String(s.date||'');
      const start = String(s.start||'');
      const end = String(s.end||'');
      const serviceId = String(s.serviceId||'');
      const cap = Number(s.cap||1);
      if(!date || !start || !end || !serviceId || isNaN(cap) || cap<=0){ skipped++; continue; }
      if(s.id && byId.has(s.id)){
        const idx = current.findIndex(x=> x.id === s.id);
        if(idx !== -1){
          current[idx] = {
            ...current[idx],
            date, start, end, serviceId,
            cap: cap,
            open: (typeof s.open === 'undefined') ? (typeof current[idx].open==='undefined'? true : !!current[idx].open) : !!s.open,
            providerId: session.id,
            id: current[idx].id
          };
          updated++;
        }else{ skipped++; }
      }else{
        const dupIdx = current.findIndex(x=> x.providerId===session.id && x.date===date && x.start===start && x.end===end && x.serviceId===serviceId);
        if(dupIdx !== -1){
          current[dupIdx] = {
            ...current[dupIdx],
            date, start, end, serviceId,
            cap: cap,
            open: (typeof s.open === 'undefined') ? (typeof current[dupIdx].open==='undefined'? true : !!current[dupIdx].open) : !!s.open,
            providerId: session.id
          };
          updated++;
        }else{
          current.push({
            id: uuid(), providerId: session.id, serviceId, date, start, end, cap: cap, open: (typeof s.open==='undefined'? true: !!s.open)
          });
          added++;
        }
      }
    }
    saveSlots(current);
    renderSlotsList();
    renderCalendar();
    alert(`インポートしました。追加:${added}件 / 更新:${updated}件 / スキップ:${skipped}件`);
  }catch{
    alert('インポートに失敗しました。JSON形式をご確認ください。');
  }finally{
    const inp = document.getElementById('slots-import-input');
    if(inp && inp instanceof HTMLInputElement){ inp.value=''; }
  }
}
