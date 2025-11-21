// @ts-nocheck
import { loadOptions, saveOptions, createOption, updateOption, deleteOption } from './options.js';

function $ (s, root=document){ return root.querySelector(s); }
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

function renderList(){
  const tbody = $('#options-tbody');
  if(!tbody) return;
  const all = loadOptions();
  tbody.textContent = '';
  for(const o of all){
    const tr = document.createElement('tr');
    const tdName = document.createElement('td'); tdName.textContent = o.name || '';
    const tdPrice = document.createElement('td'); tdPrice.textContent = o.price ? '¥' + Number(o.price).toLocaleString() : '';
    const tdDesc = document.createElement('td'); tdDesc.textContent = o.description || '';
    const tdActive = document.createElement('td'); tdActive.textContent = o.active ? 'はい' : 'いいえ';
    const tdOps = document.createElement('td'); tdOps.className = 'cluster';
    const btnEdit = document.createElement('button'); btnEdit.className = 'btn btn-ghost'; btnEdit.setAttribute('data-action','edit'); btnEdit.setAttribute('data-id', o.id); btnEdit.textContent = '編集';
    const btnDel = document.createElement('button'); btnDel.className = 'btn btn-ghost danger'; btnDel.setAttribute('data-action','delete'); btnDel.setAttribute('data-id', o.id); btnDel.textContent = '削除';
    tdOps.appendChild(btnEdit); tdOps.appendChild(btnDel);
    tr.appendChild(tdName); tr.appendChild(tdPrice); tr.appendChild(tdDesc); tr.appendChild(tdActive); tr.appendChild(tdOps);
    tbody.appendChild(tr);
  }
}

function openModal(){
  const modal = $('#option-modal');
  if(!modal) return;
  modal.hidden = false; modal.style.display='block'; document.body.classList.add('modal-open');
}
function closeModal(){
  const modal = $('#option-modal');
  if(!modal) return;
  modal.hidden = true; modal.style.display='none'; document.body.classList.remove('modal-open');
}

function populateForm(opt){
  $('#option-id').value = opt ? opt.id : '';
  $('#option-name').value = opt ? opt.name : '';
  $('#option-price').value = opt && typeof opt.price !== 'undefined' ? opt.price : '';
  $('#option-desc').value = opt ? opt.description : '';
  $('#option-active').checked = opt ? !!opt.active : true;
}

(function init(){
  try{ renderList(); }catch{};
  const open = $('#open-option-modal');
  if(open) open.addEventListener('click', ()=>{ populateForm(null); openModal(); });
  const openTop = document.getElementById('open-option-modal-top');
  if(openTop) openTop.addEventListener('click', ()=>{ populateForm(null); openModal(); });
  // also support opening from providers admin page's button
  const open2 = document.getElementById('open-admin-options');
  if(open2) open2.addEventListener('click', ()=>{ populateForm(null); openModal(); });
  // support opening from provider pages' "manage options" button
  const manageBtn = document.getElementById('manage-options-btn');
  if(manageBtn) manageBtn.addEventListener('click', ()=>{ populateForm(null); openModal(); });
  const provLink = document.getElementById('prov-options-link');
  if(provLink) provLink.addEventListener('click', (e)=>{ e.preventDefault(); populateForm(null); openModal(); });
  // delegate provider navbar clicks in case navbar is injected after this script runs
  document.addEventListener('click', (e)=>{
    try{
      const a = e.target && e.target.closest && e.target.closest('#prov-options-link');
      if(a){ e.preventDefault(); populateForm(null); openModal(); }
    }catch(e){}
  });
  const cancel = $('#option-cancel'); if(cancel) cancel.addEventListener('click', closeModal);
  const tbody = $('#options-tbody');
  if(tbody){ tbody.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-action]'); if(!btn) return;
    const action = btn.getAttribute('data-action'); const id = btn.getAttribute('data-id');
    if(action === 'edit'){
      const all = loadOptions(); const o = all.find(x=> x.id === id); populateForm(o); openModal();
    } else if(action === 'delete'){
      if(!confirm('このオプションを削除しますか？')) return; deleteOption(id); renderList();
    }
  }); }
  const form = $('#option-form');
  if(form){ form.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const id = $('#option-id').value || '';
    const name = $('#option-name').value.trim();
    const price = $('#option-price').value !== '' ? Number($('#option-price').value) : 0;
    const desc = $('#option-desc').value || '';
    const active = !!$('#option-active').checked;
    if(!name){ alert('名前を入力してください'); return; }
    if(id){ updateOption(id, { name, price, description: desc, active }); }
    else { createOption({ name, price, description: desc, active }); }
    renderList();
    // notify other parts of the app (provider pages) that options changed
    try{ window.dispatchEvent(new CustomEvent('options:changed')); }catch(e){}
    closeModal();
  }); }
})();
