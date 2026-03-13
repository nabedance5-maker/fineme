'use client';
import { useEffect, useRef } from 'react';

export default function AdminOptionsPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .modal { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; padding:20px; z-index:1000; background:rgba(0,0,0,.45); }
      .modal[hidden] { display:none; }
      .modal-content { background:#fff; border-radius:12px; width:100%; max-width:640px; max-height:90vh; overflow-y:auto; }
      .table { width:100%; border-collapse:collapse; }
      .table th, .table td { padding:8px; border-bottom:1px solid var(--color-border); text-align:left; }
    `;
    document.head.appendChild(style);

    const OPTIONS_KEY = 'glowup:options';

    function uuid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16);
      });
    }

    function loadOptions() { try { const raw = localStorage.getItem(OPTIONS_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
    function saveOptions(arr) { try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(arr)); } catch {} }
    function createOption(data) { const item = { id: uuid(), ...data, createdAt: new Date().toISOString() }; const list = loadOptions(); list.push(item); saveOptions(list); return item; }
    function updateOption(id, data) { const list = loadOptions(); const idx = list.findIndex(x => x.id === id); if (idx !== -1) { list[idx] = { ...list[idx], ...data }; saveOptions(list); } }
    function deleteOption(id) { const list = loadOptions().filter(x => x.id !== id); saveOptions(list); }

    function renderList() {
      const tbody = document.getElementById('options-tbody'); if (!tbody) return;
      const all = loadOptions(); tbody.textContent = '';
      for (const o of all) {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td'); tdName.textContent = o.name || '';
        const tdPrice = document.createElement('td'); tdPrice.textContent = o.price ? '¥' + Number(o.price).toLocaleString() : '';
        const tdDesc = document.createElement('td'); tdDesc.textContent = o.description || '';
        const tdActive = document.createElement('td'); tdActive.textContent = o.active ? 'はい' : 'いいえ';
        const tdOps = document.createElement('td'); tdOps.className = 'cluster';
        const btnEdit = document.createElement('button'); btnEdit.className = 'btn btn-ghost'; btnEdit.setAttribute('data-action', 'edit'); btnEdit.setAttribute('data-id', o.id); btnEdit.textContent = '編集';
        const btnDel = document.createElement('button'); btnDel.className = 'btn btn-ghost danger'; btnDel.setAttribute('data-action', 'delete'); btnDel.setAttribute('data-id', o.id); btnDel.textContent = '削除';
        tdOps.appendChild(btnEdit); tdOps.appendChild(btnDel);
        tr.appendChild(tdName); tr.appendChild(tdPrice); tr.appendChild(tdDesc); tr.appendChild(tdActive); tr.appendChild(tdOps);
        tbody.appendChild(tr);
      }
    }

    function openModal() { const modal = document.getElementById('option-modal'); if (!modal) return; modal.hidden = false; modal.style.display = 'flex'; document.body.classList.add('modal-open'); }
    function closeModal() { const modal = document.getElementById('option-modal'); if (!modal) return; modal.hidden = true; modal.style.display = 'none'; document.body.classList.remove('modal-open'); }

    function populateForm(opt) {
      const idEl = document.getElementById('option-id'); if (idEl) idEl.value = opt ? opt.id : '';
      const nameEl = document.getElementById('option-name'); if (nameEl) nameEl.value = opt ? opt.name : '';
      const priceEl = document.getElementById('option-price'); if (priceEl) priceEl.value = opt && typeof opt.price !== 'undefined' ? opt.price : '';
      const descEl = document.getElementById('option-desc'); if (descEl) descEl.value = opt ? opt.description : '';
      const activeEl = document.getElementById('option-active'); if (activeEl) activeEl.checked = opt ? !!opt.active : true;
    }

    // Init
    renderList();
    const open = document.getElementById('open-option-modal');
    if (open) open.addEventListener('click', () => { populateForm(null); openModal(); });
    const cancel = document.getElementById('option-cancel'); if (cancel) cancel.addEventListener('click', closeModal);

    const tbody = document.getElementById('options-tbody');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]'); if (!btn) return;
        const action = btn.getAttribute('data-action'); const id = btn.getAttribute('data-id');
        if (action === 'edit') { const all = loadOptions(); const o = all.find(x => x.id === id); populateForm(o); openModal(); }
        else if (action === 'delete') { if (!confirm('このオプションを削除しますか？')) return; deleteOption(id); renderList(); }
      });
    }

    const form = document.getElementById('option-form');
    if (form) {
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const idVal = document.getElementById('option-id')?.value || '';
        const name = document.getElementById('option-name')?.value.trim() || '';
        const priceVal = document.getElementById('option-price')?.value;
        const price = priceVal !== '' ? Number(priceVal) : 0;
        const desc = document.getElementById('option-desc')?.value || '';
        const active = !!(document.getElementById('option-active'))?.checked;
        if (!name) { alert('名前を入力してください'); return; }
        if (idVal) { updateOption(idVal, { name, price, description: desc, active }); }
        else { createOption({ name, price, description: desc, active }); }
        renderList();
        try { window.dispatchEvent(new CustomEvent('options:changed')); } catch {}
        closeModal();
      });
    }

    return () => {
      try { document.head.removeChild(style); } catch {}
    };
  }, []);

  return (
    <main className="section">
      <div className="container" style={{maxWidth:'900px'}}>
        <h1 className="section-title">オプション管理</h1>
        <div className="cluster" style={{justifyContent:'space-between',alignItems:'center'}}>
          <button id="open-option-modal" className="btn">新しいオプションを追加</button>
        </div>

        <div className="card" style={{padding:'16px',marginTop:'12px'}}>
          <table className="table" style={{width:'100%'}}>
            <thead>
              <tr><th>名前</th><th>価格</th><th>説明</th><th>有効</th><th>操作</th></tr>
            </thead>
            <tbody id="options-tbody"></tbody>
          </table>
        </div>
      </div>

      <div id="option-modal" className="modal" role="dialog" aria-modal="true" hidden style={{display:'none'}}>
        <div className="modal-content card" style={{padding:'16px',maxWidth:'640px',margin:'40px auto'}}>
          <h2 id="option-modal-title">オプションを編集</h2>
          <form id="option-form" style={{display:'flex',flexDirection:'column',gap:'8px',alignItems:'stretch'}}>
            <input type="hidden" id="option-id" />
            <label style={{display:'block'}}>名称
              <input id="option-name" required style={{width:'100%'}} />
            </label>
            <label style={{display:'block'}}>価格（円、空白可）
              <input id="option-price" type="number" min="0" step="1" style={{width:'160px'}} />
            </label>
            <label style={{display:'block'}}>説明
              <textarea id="option-desc" rows={3} style={{width:'100%'}}></textarea>
            </label>
            <label style={{display:'flex',alignItems:'center',gap:'8px'}}><input id="option-active" type="checkbox" defaultChecked /> 有効</label>
            <div style={{display:'flex',gap:'8px',justifyContent:'flex-end',marginTop:'6px'}}>
              <button id="option-save" className="btn" type="submit">保存</button>
              <button id="option-cancel" className="btn btn-ghost" type="button">キャンセル</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
