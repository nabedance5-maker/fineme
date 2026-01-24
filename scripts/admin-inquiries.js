// @ts-nocheck
// Admin: Inquiries viewer (localStorage)

const KEY = 'fineme:provider:inquiries';

function loadInquiries(){
  try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch{ return []; }
}
function saveInquiries(arr){
  try{ localStorage.setItem(KEY, JSON.stringify(arr)); }catch{}
}
function labelCategory(v){
  const map = {
    hair: '美容室・ヘアサロン',
    esthetic: 'エステ・痩身',
    nails: 'ネイル',
    makeup: 'メイク・顔分析',
    eyelash: 'まつ毛・アイブロウ',
    cosmetic: '美容外科・美容クリニック'
  };
  return map[v] || '—';
}
function formatDate(iso){
  if(!iso) return '—';
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${y}/${m}/${day} ${hh}:${mm}`;
}
function ensureIds(arr){
  let changed = false;
  for(const it of arr){
    if(!it.id){ it.id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2,8)}`; changed = true; }
    if(!it.status){ it.status = 'new'; changed = true; }
  }
  if(changed) saveInquiries(arr);
  return arr;
}
function filterInquiries(arr, { q, cat, status }){
  const qq = (q||'').toLowerCase();
  return arr.filter(it=>{
    if(cat && it.category !== cat) return false;
    if(status && it.status !== status) return false;
    if(qq){
      const hay = [it.bizName, it.contactName, it.email, it.phone, it.message].map(v=> (v||'').toString().toLowerCase()).join(' ');
      if(!hay.includes(qq)) return false;
    }
    return true;
  });
}
function exportJSON(arr){
  const blob = new Blob([JSON.stringify(arr, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `inquiries-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function toCSV(arr){
  const headers = ['id','createdAt','status','bizName','contactName','email','phone','category','contactPref','message'];
  const esc = (v)=> '"' + (String(v||'').replace(/"/g,'""')) + '"';
  const lines = [headers.join(',')];
  for(const it of arr){ lines.push(headers.map(h=> esc(it[h])).join(',')); }
  return lines.join('\n');
}
function exportCSV(arr){
  const csv = toCSV(arr);
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `inquiries-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function render(){
  const tbody = document.getElementById('inq-tbody');
  const q = document.getElementById('inq-q').value;
  const cat = document.getElementById('inq-cat').value;
  const status = document.getElementById('inq-status').value;
  const all = ensureIds(loadInquiries());
  const arr = filterInquiries(all, { q, cat, status }).sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''));
  tbody.innerHTML = '';
  if(!arr.length){
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8; td.className = 'muted'; td.textContent = 'データがありません';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }
  for(const it of arr){
    const tr = document.createElement('tr');
    const contact = [it.email, it.phone].filter(Boolean).join(' / ');
    tr.innerHTML = `
      <td>${formatDate(it.createdAt)}</td>
      <td>${it.bizName || '—'}</td>
      <td>${it.contactName || '—'}</td>
      <td>${contact || '—'}</td>
      <td>${labelCategory(it.category)}</td>
      <td>${it.contactPref || '—'}</td>
      <td><span class="badge ${it.status==='done'?'status-done':'status-new'}">${it.status==='done'?'対応済み':'未対応'}</span></td>
      <td class="row-note">詳細 / 完了 / 削除</td>
    `;
    // expand row for message and actions
    const tr2 = document.createElement('tr');
    const td2 = document.createElement('td');
    td2.colSpan = 8;
    td2.innerHTML = `
      <div class="stack" style="gap:6px">
        <div class="msg">${(it.message||'').replace(/</g,'&lt;')}</div>
        <div class="cluster" style="gap:8px">
          <button class="btn btn-ghost" data-act="done">${it.status==='done'?'未対応に戻す':'対応済みにする'}</button>
          <button class="btn btn-ghost" data-act="copy">内容をコピー</button>
          <button class="btn btn-ghost" data-act="delete" style="color:#b91c1c">削除</button>
        </div>
      </div>`;
    tr2.appendChild(td2);

    // actions
    td2.querySelector('[data-act="done"]').addEventListener('click', ()=>{
      const all2 = ensureIds(loadInquiries());
      const idx = all2.findIndex(x=> x.id===it.id);
      if(idx>=0){ all2[idx].status = (all2[idx].status==='done') ? 'new' : 'done'; saveInquiries(all2); render(); }
    });
    td2.querySelector('[data-act="copy"]').addEventListener('click', ()=>{
      const text = [
        `【会社/屋号】${it.bizName||''}`,
        `【担当者】${it.contactName||''}`,
        `【メール】${it.email||''}`,
        it.phone?`【電話】${it.phone}`:'',
        `【カテゴリ】${labelCategory(it.category)}`,
        `【連絡希望】${it.contactPref||''}`,
        `【内容】${(it.message||'').trim()}`
      ].filter(Boolean).join('\n');
      navigator.clipboard.writeText(text).catch(()=>{});
    });
    td2.querySelector('[data-act="delete"]').addEventListener('click', ()=>{
      if(!confirm('この問い合わせを削除しますか？')) return;
      const all2 = ensureIds(loadInquiries());
      saveInquiries(all2.filter(x=> x.id!==it.id));
      render();
    });

    tbody.appendChild(tr);
    tbody.appendChild(tr2);
  }
}

function bindControls(){
  const q = document.getElementById('inq-q');
  const cat = document.getElementById('inq-cat');
  const status = document.getElementById('inq-status');
  [q,cat,status].forEach(el=> el.addEventListener('input', ()=> render()));
  document.getElementById('inq-export-json').addEventListener('click', ()=> exportJSON(ensureIds(loadInquiries())));
  document.getElementById('inq-export-csv').addEventListener('click', ()=> exportCSV(ensureIds(loadInquiries())));
  document.getElementById('inq-clear').addEventListener('click', ()=>{
    if(!confirm('すべての問い合わせを削除しますか？')) return;
    saveInquiries([]); render();
  });
}

(function init(){
  try{ bindControls(); render(); }catch(e){ console.error(e); }
})();
