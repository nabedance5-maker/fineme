// @ts-nocheck
import { loadOptions, updateOption, createOption, deleteOption } from './options.js';

function $(s, root=document){ return root.querySelector(s); }
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

function renderList(){
  const tbody = document.getElementById('options-list-tbody');
  if(!tbody) return;
  const all = loadOptions();
  tbody.textContent = '';
  for(const o of all){
    const tr = document.createElement('tr'); tr.dataset.id = o.id;
    const tdName = document.createElement('td'); tdName.textContent = o.name || ''; tr.appendChild(tdName);
    const tdPrice = document.createElement('td'); tdPrice.textContent = o.price ? '¥' + Number(o.price).toLocaleString() : ''; tr.appendChild(tdPrice);
    const tdDesc = document.createElement('td'); tdDesc.textContent = o.description || ''; tr.appendChild(tdDesc);
    const tdActive = document.createElement('td'); tdActive.textContent = o.active ? 'はい' : 'いいえ'; tr.appendChild(tdActive);
    const tdOps = document.createElement('td'); tdOps.className = 'cluster';
    const btnEdit = document.createElement('button'); btnEdit.className = 'btn btn-ghost'; btnEdit.setAttribute('data-action','edit'); btnEdit.setAttribute('data-id', o.id); btnEdit.textContent = '編集';
    const btnDel = document.createElement('button'); btnDel.className = 'btn btn-ghost danger'; btnDel.setAttribute('data-action','delete'); btnDel.setAttribute('data-id', o.id); btnDel.textContent = '削除';
    tdOps.appendChild(btnEdit); tdOps.appendChild(btnDel); tr.appendChild(tdOps);
    tbody.appendChild(tr);
  }
}

function openModal(){
  const modal = document.getElementById('options-list-modal'); if(!modal) return;
  modal.hidden = false; modal.style.display='block'; document.body.classList.add('modal-open');
}
function closeModal(){
  const modal = document.getElementById('options-list-modal'); if(!modal) return;
  modal.hidden = true; modal.style.display='none'; document.body.classList.remove('modal-open');
}

function insertEditRow(id){
  // remove existing edit rows
  const existing = document.getElementById('options-edit-row'); if(existing) existing.remove();
  const tr = document.querySelector(`tr[data-id="${id}"]`);
  if(!tr) return;
  const all = loadOptions(); const o = all.find(x=> x.id === id);
  const edit = document.createElement('tr'); edit.id = 'options-edit-row';
  const td = document.createElement('td'); td.setAttribute('colspan','5');
  const form = document.createElement('form'); form.id = 'option-inline-form'; form.style.display='flex'; form.style.gap='12px'; form.style.alignItems='center';
  const labelName = document.createElement('label'); labelName.style.flex='2'; labelName.textContent = '名称'; const inputName = document.createElement('input'); inputName.name = 'name'; inputName.required = true; inputName.value = o.name || ''; labelName.appendChild(inputName);
  const labelPrice = document.createElement('label'); labelPrice.style.flex='1'; labelPrice.textContent = '価格'; const inputPrice = document.createElement('input'); inputPrice.name = 'price'; inputPrice.type = 'number'; inputPrice.min = '0'; inputPrice.step = '1'; inputPrice.value = typeof o.price !== 'undefined' ? String(o.price) : '' ; labelPrice.appendChild(inputPrice);
  const labelDesc = document.createElement('label'); labelDesc.style.flex='3'; labelDesc.textContent = '説明'; const inputDesc = document.createElement('input'); inputDesc.name = 'description'; inputDesc.value = o.description || ''; labelDesc.appendChild(inputDesc);
  const labelActive = document.createElement('label'); labelActive.style.flex='1'; labelActive.style.display='flex'; labelActive.style.alignItems='center'; labelActive.style.gap='8px'; const inputActive = document.createElement('input'); inputActive.type='checkbox'; inputActive.name='active'; inputActive.checked = !!o.active; labelActive.appendChild(inputActive); labelActive.appendChild(document.createTextNode(' 有効'));
  const opsDiv = document.createElement('div'); opsDiv.style.flex = '0 0 auto'; opsDiv.style.display = 'flex'; opsDiv.style.gap = '8px'; const saveBtn = document.createElement('button'); saveBtn.className='btn'; saveBtn.type='submit'; saveBtn.textContent='保存'; const cancelBtn = document.createElement('button'); cancelBtn.className='btn btn-ghost'; cancelBtn.type='button'; cancelBtn.id = 'option-inline-cancel'; cancelBtn.textContent='キャンセル'; opsDiv.appendChild(saveBtn); opsDiv.appendChild(cancelBtn);
  form.appendChild(labelName); form.appendChild(labelPrice); form.appendChild(labelDesc); form.appendChild(labelActive); form.appendChild(opsDiv);
  td.appendChild(form); edit.appendChild(td); tr.insertAdjacentElement('afterend', edit);
  const formEl = document.getElementById('option-inline-form');
  formEl.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(formEl);
    const name = (fd.get('name')||'').toString().trim();
    const price = fd.get('price')!==null && fd.get('price')!=='' ? Number(fd.get('price')) : 0;
    const desc = (fd.get('description')||'').toString();
    const active = !!fd.get('active');
    if(!name){ alert('名前を入力してください'); return; }
    updateOption(id, { name, price, description: desc, active });
    window.dispatchEvent(new CustomEvent('options:changed'));
    renderList();
    // remove edit row
    const er = document.getElementById('options-edit-row'); if(er) er.remove();
  });
  document.getElementById('option-inline-cancel')?.addEventListener('click', ()=>{ const er = document.getElementById('options-edit-row'); if(er) er.remove(); });
}

function onTableClick(e){
  const btn = e.target.closest('button[data-action]'); if(!btn) return;
  const action = btn.getAttribute('data-action'); const id = btn.getAttribute('data-id');
  if(action === 'edit'){
    insertEditRow(id);
  }else if(action === 'delete'){
    if(!confirm('このオプションを削除しますか？')) return;
    deleteOption(id); window.dispatchEvent(new CustomEvent('options:changed')); renderList();
  }
}

(function init(){
  const openList = document.getElementById('open-options-list-btn'); if(openList) openList.addEventListener('click', ()=>{ renderList(); openModal(); });
  const openTop = document.getElementById('open-option-modal-top'); if(openTop) openTop.addEventListener('click', ()=>{ document.getElementById('open-option-modal')?.click(); });
  const tbody = document.getElementById('options-list-tbody'); if(tbody) tbody.addEventListener('click', onTableClick);
  const closeBtn = document.getElementById('options-list-close'); if(closeBtn) closeBtn.addEventListener('click', closeModal);
  // refresh on changes
  window.addEventListener('options:changed', ()=>{ renderList(); populateCheckboxesIfPresent(); });
  // initial render for embedded list
  renderList();

  // utility: refresh options-checkboxes in page if present
  function populateCheckboxesIfPresent(){
    const wrap = document.getElementById('options-checkboxes'); if(!wrap) return;
    const opts = loadOptions().filter(o=> o && o.active);
    if(!opts.length){ wrap.textContent = ''; const sp = document.createElement('span'); sp.className = 'muted'; sp.textContent = '登録されたオプションはありません'; wrap.appendChild(sp); return; }
    wrap.textContent = '';
    for(const o of opts){ const label = document.createElement('label'); label.style.display='flex'; label.style.gap='12px'; label.style.alignItems='flex-start'; const input = document.createElement('input'); input.type='checkbox'; input.name='optionIds'; input.value = String(o.id); const div = document.createElement('div'); div.style.lineHeight='1.2'; const nameDiv = document.createElement('div'); nameDiv.style.fontWeight='700'; nameDiv.textContent = o.name || ''; const priceDiv = document.createElement('div'); priceDiv.style.color = 'var(--muted)'; priceDiv.style.fontSize='13px'; priceDiv.textContent = o.price ? '¥' + Number(o.price).toLocaleString() : ''; const descDiv = document.createElement('div'); descDiv.style.color = 'var(--muted)'; descDiv.style.fontSize='13px'; descDiv.textContent = o.description || ''; div.appendChild(nameDiv); div.appendChild(priceDiv); div.appendChild(descDiv); label.appendChild(input); label.appendChild(div); wrap.appendChild(label); }
  }
})();
