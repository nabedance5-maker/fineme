'use client';
import { useEffect, useRef } from 'react';

export default function ProviderStaffPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      body.modal-open{ overflow:hidden; }
      .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);display:block;z-index:999}
      .modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;z-index:1000}
      .modal[hidden], .modal-backdrop[hidden]{display:none}
      #staff-modal-backdrop{opacity:0;transition:opacity .2s ease}
      #staff-modal-backdrop.is-open{opacity:1}
      #staff-modal .modal-content{opacity:0;transform:translateY(8px) scale(.98);transition:opacity .2s ease, transform .2s ease;width:min(100%,720px);max-height:min(90vh,720px);overflow:auto}
      #staff-modal.is-open .modal-content{opacity:1;transform:none}
      @media (max-width: 640px){
        #staff-modal{padding:12px}
        #staff-modal .modal-content{width:100%;max-height:92vh}
      }
    `;
    document.head.appendChild(style);

    // --- Inlined auth helpers from scripts/auth.js ---
    const BASE_PREFIX = (location.hostname && /github\.io$/i.test(location.hostname)) ? '/fineme' : '';
    const PROVIDER_SESSION_KEY = 'glowup:providerSession';

    function getProviderSession() {
      try { const raw = sessionStorage.getItem(PROVIDER_SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
    }

    function requireProviderAuth() {
      const session = getProviderSession();
      if (!session) {
        try {
          const current = (location.pathname || '/') + (location.search || '') + (location.hash || '');
          location.href = BASE_PREFIX + '/pages/login.html?returnTo=' + encodeURIComponent(current);
        } catch {
          location.href = BASE_PREFIX + '/pages/login.html';
        }
        return null;
      }
      return session;
    }

    // Require auth
    const authSession = requireProviderAuth();
    if (!authSession) return;

    // --- Ported from scripts/provider-staff.js ---
    const safeUrl = (typeof globalThis !== 'undefined' && typeof globalThis.safeUrl === 'function') ? globalThis.safeUrl : null;
    const PROVIDERS_KEY = 'glowup:providers';
    const SESSION_KEY = 'glowup:providerSession';

    function $(s, root = document) { return root.querySelector(s); }
    function loadProviders() { try { const raw = localStorage.getItem(PROVIDERS_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
    function saveProviders(list) {
      localStorage.setItem(PROVIDERS_KEY, JSON.stringify(list));
      // auto export if enabled
      try {
        const cb = document.getElementById('staff-auto-export');
        if (cb && cb instanceof HTMLInputElement && cb.checked) {
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `staff-backup-${ts}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        }
      } catch { }
    }
    function getSession() { try { const raw = sessionStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }

    function getMyProvider() { const s = getSession(); if (!s) return null; return loadProviders().find(p => p.id === s.id) || null; }

    function renderList() {
      const me = getMyProvider();
      const tbody = $('#staff-tbody');
      if (!tbody) return;
      const list = (me && me.profile && Array.isArray(me.profile.staffs)) ? me.profile.staffs : [];
      while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
      if (list.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.className = 'muted';
        td.textContent = 'スタッフが登録されていません。';
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }
      list.forEach(st => {
        const tr = document.createElement('tr');
        // photo cell
        const tdImg = document.createElement('td');
        if (st.photo) {
          try {
            const img = document.createElement('img');
            const src = (typeof safeUrl === 'function') ? (safeUrl(st.photo) || '') : (st.photo || '');
            if (src) img.src = src;
            img.alt = st.name || '';
            img.style.width = '44px'; img.style.height = '44px'; img.style.borderRadius = '50%'; img.style.objectFit = 'cover'; img.style.background = '#f3f4f6';
            img.addEventListener('error', () => { try { img.style.display = 'none'; } catch { } });
            tdImg.appendChild(img);
          } catch (e) { /* ignore image errors */ }
        }
        tr.appendChild(tdImg);
        const tdName = document.createElement('td'); tdName.textContent = st.name || ''; tr.appendChild(tdName);
        const tdRole = document.createElement('td'); tdRole.textContent = st.role || ''; tr.appendChild(tdRole);
        const tdOne = document.createElement('td'); tdOne.textContent = st.oneLiner || st.intro || st.bio || ''; tr.appendChild(tdOne);
        const tdActions = document.createElement('td'); tdActions.className = 'cluster';
        const btnEdit = document.createElement('button'); btnEdit.className = 'btn btn-ghost'; btnEdit.setAttribute('data-action', 'edit'); btnEdit.setAttribute('data-id', st.id); btnEdit.textContent = '編集';
        const btnDel = document.createElement('button'); btnDel.className = 'btn btn-ghost danger'; btnDel.setAttribute('data-action', 'delete'); btnDel.setAttribute('data-id', st.id); btnDel.textContent = '削除';
        tdActions.appendChild(btnEdit); tdActions.appendChild(btnDel);
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
      });
    }

    function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }

    function readAndResizeImage(file, maxSize = 1200) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const w = img.width, h = img.height;
            const scale = Math.min(1, maxSize / Math.max(w, h));
            const cw = Math.round(w * scale), ch = Math.round(h * scale);
            const canvas = document.createElement('canvas');
            canvas.width = cw; canvas.height = ch;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, cw, ch);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    async function onSubmit(e) {
      e.preventDefault();
      const s = getSession(); if (!s) return;
      const list = loadProviders();
      const idx = list.findIndex(p => p.id === s.id); if (idx === -1) return;
      const me = list[idx];
      const fd = new FormData(e.currentTarget);
      const id = ($('#staff-id')?.value || '').toString();
      const name = (fd.get('staff-name') || $('#staff-name')?.value || '').toString().trim();
      const role = (fd.get('staff-role') || $('#staff-role')?.value || '').toString().trim();
      const experienceYear = parseInt((document.getElementById('staff-experienceYear')?.value || '').toString(), 10);
      const oneLiner = (fd.get('staff-oneLiner') || $('#staff-oneLiner')?.value || '').toString();
      const intro = (fd.get('staff-intro') || $('#staff-intro')?.value || '').toString();
      const history = (fd.get('staff-history') || $('#staff-history')?.value || '').toString();
      const msg = $('#staff-message');
      if (!name) { if (msg) msg.textContent = '氏名を入力してください。'; return; }
      const arr = Array.isArray(me.profile?.staffs) ? me.profile.staffs : (me.profile = { ...(me.profile || {}), staffs: [] }).staffs;
      const photoInput = document.getElementById('staff-photo');
      const photoCurrent = document.getElementById('staff-photo-current');
      let photoDataUrl = '';
      if (photoInput && photoInput.files && photoInput.files[0]) {
        try { photoDataUrl = await readAndResizeImage(photoInput.files[0], 1200); }
        catch (err) { console.error(err); if (msg) msg.textContent = '画像の読み込みに失敗しました。'; }
      } else if (photoCurrent) {
        photoDataUrl = photoCurrent.value || '';
      }
      if (id) {
        const i = arr.findIndex(x => x.id === id);
        if (i !== -1) { arr[i] = { ...arr[i], name, role, experienceYear: isNaN(experienceYear) ? undefined : experienceYear, oneLiner, intro, history, photo: photoDataUrl }; }
      } else {
        arr.push({ id: uuid(), name, role, experienceYear: isNaN(experienceYear) ? undefined : experienceYear, oneLiner, intro, history, photo: photoDataUrl });
      }
      saveProviders(list);
      if (msg) msg.textContent = '保存しました。';
      resetForm();
      renderList();
    }

    function onTableClick(e) {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      const s = getSession(); if (!s) return;
      const list = loadProviders();
      const idx = list.findIndex(p => p.id === s.id); if (idx === -1) return;
      const me = list[idx];
      const arr = Array.isArray(me.profile?.staffs) ? me.profile.staffs : [];
      if (btn.getAttribute('data-action') === 'delete') {
        const i = arr.findIndex(x => x.id === id);
        if (i !== -1) { arr.splice(i, 1); saveProviders(list); renderList(); }
      } else if (btn.getAttribute('data-action') === 'edit') {
        const it = arr.find(x => x.id === id);
        if (it) {
          $('#staff-id').value = it.id;
          $('#staff-name').value = it.name || '';
          $('#staff-role').value = it.role || '';
          const oneEl = document.getElementById('staff-oneLiner'); if (oneEl) oneEl.value = it.oneLiner || '';
          const expEl = document.getElementById('staff-experienceYear'); if (expEl) expEl.value = (it.experienceYear != null ? it.experienceYear : '');
          const introEl = document.getElementById('staff-intro'); if (introEl) introEl.value = it.intro || it.bio || '';
          const histEl = document.getElementById('staff-history'); if (histEl) histEl.value = it.history || '';
          const cur = document.getElementById('staff-photo-current');
          const preview = document.getElementById('staff-photo-preview');
          const file = document.getElementById('staff-photo');
          if (file) file.value = '';
          if (cur) cur.value = it.photo || '';
          if (preview) {
            try { const s = (typeof safeUrl === 'function') ? (safeUrl(it.photo) || '') : (it.photo || ''); if (s) { preview.src = s; preview.style.display = 'inline-block'; } else { preview.src = ''; preview.style.display = 'none'; } } catch (e) { preview.src = it.photo || ''; preview.style.display = it.photo ? 'inline-block' : 'none'; }
          }
          const msgEl = $('#staff-message'); if (msgEl) msgEl.textContent = '編集中…';
          const btnSave = $('#staff-save'); if (btnSave) btnSave.textContent = '更新';
          openStaffModal();
        }
      }
    }

    function resetForm() {
      $('#staff-id').value = '';
      $('#staff-name').value = '';
      $('#staff-role').value = '';
      const one2 = document.getElementById('staff-oneLiner'); if (one2) one2.value = '';
      const introEl2 = document.getElementById('staff-intro'); if (introEl2) introEl2.value = '';
      const histEl2 = document.getElementById('staff-history'); if (histEl2) histEl2.value = '';
      const expEl2 = document.getElementById('staff-experienceYear'); if (expEl2) expEl2.value = '';
      const file = document.getElementById('staff-photo'); if (file) file.value = '';
      const cur = document.getElementById('staff-photo-current'); if (cur) cur.value = '';
      const preview = document.getElementById('staff-photo-preview'); if (preview) { preview.src = ''; preview.style.display = 'none'; }
      const btnSave = $('#staff-save'); if (btnSave) btnSave.textContent = '保存';
      const msg = $('#staff-message'); if (msg) msg.textContent = '';
    }

    function openStaffModal() {
      const modal = document.getElementById('staff-modal');
      const backdrop = document.getElementById('staff-modal-backdrop');
      if (modal) { modal.hidden = false; requestAnimationFrame(() => modal.classList.add('is-open')); }
      if (backdrop) { backdrop.hidden = false; requestAnimationFrame(() => backdrop.classList.add('is-open')); }
      document.body.classList.add('modal-open');
    }

    function closeStaffModal() {
      const modal = document.getElementById('staff-modal');
      const backdrop = document.getElementById('staff-modal-backdrop');
      if (modal) { modal.classList.remove('is-open'); }
      if (backdrop) { backdrop.classList.remove('is-open'); }
      setTimeout(() => {
        if (modal) modal.hidden = true;
        if (backdrop) backdrop.hidden = true;
      }, 180);
      document.body.classList.remove('modal-open');
    }

    // --- Init ---
    const form = document.getElementById('staff-form');
    if (form) { form.addEventListener('submit', onSubmit); }
    const cancel = document.getElementById('staff-cancel');
    if (cancel) { cancel.addEventListener('click', () => { resetForm(); closeStaffModal(); }); }
    const tbody = document.getElementById('staff-tbody');
    if (tbody) { tbody.addEventListener('click', onTableClick); }

    const photoInput = document.getElementById('staff-photo');
    const photoClear = document.getElementById('staff-photo-clear');
    if (photoInput) {
      photoInput.addEventListener('change', async () => {
        const file = photoInput.files && photoInput.files[0];
        const msg = document.getElementById('staff-message');
        const preview = document.getElementById('staff-photo-preview');
        const cur = document.getElementById('staff-photo-current');
        if (!file) return;
        try {
          const dataUrl = await readAndResizeImage(file, 1200);
          if (preview) { try { const s = (typeof safeUrl === 'function') ? (safeUrl(dataUrl) || '') : (dataUrl || ''); if (s) { preview.src = s; preview.style.display = 'inline-block'; } else { preview.src = ''; preview.style.display = 'none'; } } catch (e) { preview.src = dataUrl; preview.style.display = 'inline-block'; } }
          if (cur) { cur.value = dataUrl; }
        } catch (err) { console.error(err); if (msg) msg.textContent = '画像の読み込みに失敗しました。'; }
      });
    }
    if (photoClear) {
      photoClear.addEventListener('click', () => {
        const preview = document.getElementById('staff-photo-preview');
        const cur = document.getElementById('staff-photo-current');
        const input = document.getElementById('staff-photo');
        if (input) input.value = '';
        if (cur) cur.value = '';
        if (preview) { preview.src = ''; preview.style.display = 'none'; }
      });
    }

    renderList();

    // auto export toggle
    try {
      const key = 'glowup:staff:autoExport';
      const cb = document.getElementById('staff-auto-export');
      if (cb && cb instanceof HTMLInputElement) {
        const saved = localStorage.getItem(key);
        if (saved === null) { cb.checked = false; localStorage.setItem(key, '0'); }
        else { cb.checked = saved === '1'; }
        cb.addEventListener('change', () => localStorage.setItem(key, cb.checked ? '1' : '0'));
      }
    } catch { }

    // open modal wiring
    const openBtn = document.getElementById('open-staff-modal-btn');
    if (openBtn) { openBtn.addEventListener('click', () => { resetForm(); openStaffModal(); }); }

    // modal close wiring
    const closeBtn = document.getElementById('staff-modal-close');
    if (closeBtn) { closeBtn.addEventListener('click', closeStaffModal); }
    const backdropEl = document.getElementById('staff-modal-backdrop');
    if (backdropEl) { backdropEl.addEventListener('click', closeStaffModal); }
    const onKeyDown = (e) => { if (e.key === 'Escape') { closeStaffModal(); } };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      try { document.head.removeChild(style); } catch { }
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: '960px' }}>
        <h1 className="section-title">スタッフプロフィール</h1>
        <p className="muted">スタッフの登録・編集を行います（ブラウザ保存・デモ）。</p>

        <div className="card" style={{ padding: '16px' }}>
          <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div className="muted">スタッフの追加・編集はモーダルで行います。</div>
            <div className="cluster" style={{ gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="cluster" style={{ alignItems: 'center', gap: '8px' }}>
                <input id="staff-auto-export" type="checkbox" />
                <span className="muted">保存時に自動バックアップ</span>
              </label>
              <button id="open-staff-modal-btn" className="btn" type="button">新規スタッフを追加</button>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '0' }}>
          <table className="table">
            <thead>
              <tr>
                <th>写真</th>
                <th>氏名</th>
                <th>役割</th>
                <th>紹介</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody id="staff-tbody"></tbody>
          </table>
        </div>

        {/* Modal: Staff Form */}
        <div id="staff-modal-backdrop" className="modal-backdrop" hidden></div>
        <div id="staff-modal" className="modal" role="dialog" aria-modal="true" aria-labelledby="staff-modal-title" hidden>
          <div className="modal-content card" style={{ padding: '20px' }}>
            <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 id="staff-modal-title" style={{ margin: '0' }}>スタッフ登録・編集</h2>
              <button id="staff-modal-close" className="btn btn-ghost" type="button" aria-label="閉じる">×</button>
            </div>
            <form id="staff-form" className="stack" style={{ gap: '12px' }}>
              <input type="hidden" id="staff-id" />
              <input type="hidden" id="staff-photo-current" />
              <div className="cluster">
                <label style={{ flex: '1' }}>氏名
                  <input id="staff-name" type="text" placeholder="例）山田 太郎" />
                </label>
                <label style={{ flex: '1' }}>肩書き/役割
                  <input id="staff-role" type="text" placeholder="例）スタイリスト" />
                </label>
                <label style={{ width: '180px' }}>開始年（経験）
                  <input id="staff-experienceYear" type="number" min="1900" max="2100" placeholder="例）2018" />
                </label>
              </div>
              <label>ひとこと
                <textarea id="staff-oneLiner" rows="2" placeholder="一言メッセージ等（短文）"></textarea>
              </label>
              <label>自己紹介
                <textarea id="staff-intro" rows="4" placeholder="ご挨拶や得意分野、想いなど（複数行可）"></textarea>
              </label>
              <label>略歴
                <textarea id="staff-history" rows="4" placeholder="学歴・職歴・受賞歴・資格など（時系列で）"></textarea>
              </label>
              <div className="stack">
                <label>写真
                  <input id="staff-photo" type="file" accept="image/*" />
                </label>
                <div className="cluster" style={{ alignItems: 'flex-start' }}>
                  <img id="staff-photo-preview" alt="スタッフ写真プレビュー" style={{ width: '88px', height: '88px', borderRadius: '50%', objectFit: 'cover', display: 'none', background: '#f3f4f6' }} />
                  <button className="btn btn-ghost" id="staff-photo-clear" type="button">写真をクリア</button>
                </div>
                <p className="muted">画像は自動的に縮小（最大1200px）して保存されます。</p>
              </div>
              <div className="cluster">
                <button className="btn" id="staff-save" type="submit">保存</button>
                <button className="btn btn-ghost" id="staff-cancel" type="button">キャンセル</button>
                <span id="staff-message" className="muted" aria-live="polite"></span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
