'use client';
import { useEffect, useRef } from 'react';

export default function ServiceFormPage() {
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
      #service-modal-backdrop{opacity:0;transition:opacity .2s ease;}
      #service-modal-backdrop.is-open{opacity:1;}
      #service-modal .modal-content{opacity:0;transform:translateY(8px) scale(.98);transition:opacity .2s ease, transform .2s ease;}
      #service-modal.is-open .modal-content{opacity:1;transform:none;}
      #service-modal .modal-content{width:min(100%, 800px);max-height:min(90vh, 720px);overflow:auto}
      @media (max-width: 640px){
        #service-modal{padding:12px}
        #service-modal .modal-content{width:100%;max-height:92vh}
      }
      #gallery-preview{ display:flex; flex-wrap:wrap; gap:8px; align-items:flex-start; }
      .gallery-item{ display:flex; flex-direction:column; align-items:center; gap:6px; width:120px; }
      .gallery-item img{ width:120px; height:90px; object-fit:cover; border-radius:6px; }
      .gallery-item button{ width:100%; }
      @media (max-width:640px){ .gallery-item{ width:calc(50% - 8px); } }
      @media (max-width:420px){ .gallery-item{ width:calc(100% - 8px); } }
      .gallery-item.dragging{ opacity:0.45; }
    `;
    document.head.appendChild(style);

    // ---- Inlined auth helpers from auth.js ----
    const BASE_PREFIX = (typeof location !== 'undefined' && /github\.io$/i.test(location.hostname)) ? '/fineme' : '';
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

    // ---- Auth check ----
    const authSession = requireProviderAuth();
    if (!authSession) return;

    // ---- Storage keys ----
    const PROVIDERS_KEY = 'glowup:providers';
    const SERVICES_KEY = 'glowup:services';
    const OPTIONS_KEY = 'glowup:options';

    // ---- Drag state ----
    let _draggingGalleryItem = null;

    // ---- Helper: $ ----
    function $(s, root = document) { return root.querySelector(s); }

    // ---- Options helpers (inlined from options.js) ----
    function optUuid() {
      return 'opt-' + 'xxxxxxxx'.replace(/[x]/g, () => (Math.random() * 16 | 0).toString(16));
    }
    function loadOptions() {
      try { const raw = localStorage.getItem(OPTIONS_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
    }
    function saveOptions(list) { localStorage.setItem(OPTIONS_KEY, JSON.stringify(list)); }
    function createOption({ name = '', description = '', price = 0, active = true } = {}) {
      const all = loadOptions();
      const o = { id: optUuid(), name: String(name || ''), description: String(description || ''), price: (Number.isFinite(Number(price)) ? Number(price) : 0), active: !!active };
      all.push(o); saveOptions(all); return o;
    }
    function updateOption(id, patch) {
      if (!id) return null;
      const all = loadOptions(); const idx = all.findIndex(o => String(o.id) === String(id));
      if (idx === -1) return null; all[idx] = { ...all[idx], ...patch }; saveOptions(all); return all[idx];
    }
    function deleteOption(id) {
      if (!id) return false;
      const all = loadOptions(); saveOptions(all.filter(o => String(o.id) !== String(id))); return true;
    }

    // ---- Services helpers ----
    function loadServices() {
      try { const raw = localStorage.getItem(SERVICES_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
    }
    function saveServices(list) {
      localStorage.setItem(SERVICES_KEY, JSON.stringify(list));
      try {
        const cb = document.getElementById('services-auto-export');
        if (cb && cb instanceof HTMLInputElement && cb.checked) {
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `services-backup-${ts}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        }
      } catch {}
    }
    function getSession() {
      try { const raw = sessionStorage.getItem(PROVIDER_SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
    }
    function uuid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    // ---- Label maps ----
    function regionLabel(v) {
      const map = { hokkaido: '北海道', aomori: '青森県', iwate: '岩手県', miyagi: '宮城県', akita: '秋田県', yamagata: '山形県', fukushima: '福島県', ibaraki: '茨城県', tochigi: '栃木県', gunma: '群馬県', saitama: '埼玉県', chiba: '千葉県', tokyo: '東京都', kanagawa: '神奈川県', niigata: '新潟県', toyama: '富山県', ishikawa: '石川県', fukui: '福井県', yamanashi: '山梨県', nagano: '長野県', gifu: '岐阜県', shizuoka: '静岡県', aichi: '愛知県', mie: '三重県', shiga: '滋賀県', kyoto: '京都府', osaka: '大阪府', hyogo: '兵庫県', nara: '奈良県', wakayama: '和歌山県', tottori: '鳥取県', shimane: '島根県', okayama: '岡山県', hiroshima: '広島県', yamaguchi: '山口県', tokushima: '徳島県', kagawa: '香川県', ehime: '愛媛県', kochi: '高知県', fukuoka: '福岡県', saga: '佐賀県', nagasaki: '長崎県', kumamoto: '熊本県', oita: '大分県', miyazaki: '宮崎県', kagoshima: '鹿児島県', okinawa: '沖縄県' };
      return map[v] || v;
    }
    function categoryLabel(v) {
      const map = { consulting: '外見トータルサポート', gym: 'パーソナルジム', makeup: 'メイクアップ', hair: 'ヘア', diagnosis: 'カラー/骨格診断', fashion: 'コーデ提案', photo: '写真撮影（アプリ等）', marriage: '結婚相談所', eyebrow: '眉毛', hairremoval: '脱毛', esthetic: 'エステ', cosmetic: '美容外科・美容クリニック', whitening: 'ホワイトニング', orthodontics: '歯科矯正', nail: 'ネイル', aga: 'AGA' };
      return map[v] || v;
    }
    function purposeLabel(v) {
      const map = { '': '', first_impression: '第一印象を変えたい', profile_photo: 'プロフィール写真を良くしたい', confidence: '恋愛で自信を持ちたい', body_shape: '体を整えたい', know_what_suits: '自分に似合うものを知りたい', total_update: 'トータルで磨く' };
      return map[v] || v;
    }

    // ---- Gallery drag & drop ----
    function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('.gallery-item:not(.dragging)')];
      for (const child of draggableElements) {
        const box = child.getBoundingClientRect();
        if (y - box.top - box.height / 2 < 0) return child;
      }
      return null;
    }
    function attachGalleryHandlers(container) {
      if (!container) return;
      Array.from(container.querySelectorAll('.gallery-item')).forEach(item => {
        item.setAttribute('draggable', 'true');
        item.style.cursor = 'grab';
        if (item._droppedHandlersAttached) return;
        item._droppedHandlersAttached = true;
        item.addEventListener('dragstart', (e) => { _draggingGalleryItem = item; item.classList.add('dragging'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'drag'); } catch {} });
        item.addEventListener('dragend', () => { if (_draggingGalleryItem) _draggingGalleryItem.classList.remove('dragging'); _draggingGalleryItem = null; });
        item.addEventListener('dragover', (e) => { e.preventDefault(); const after = getDragAfterElement(container, e.clientY); if (!after) container.appendChild(_draggingGalleryItem); else container.insertBefore(_draggingGalleryItem, after); });
      });
    }

    // ---- Image resize ----
    function resizeImageFile(file, maxSize) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            if (width > height) { if (width > maxSize) { height = Math.round(height * (maxSize / width)); width = maxSize; } }
            else { if (height > maxSize) { width = Math.round(width * (maxSize / height)); height = maxSize; } }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          };
          img.onerror = reject;
          img.src = String(reader.result || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // ---- Staff helpers ----
    function getProviders() {
      try { const raw = localStorage.getItem(PROVIDERS_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
    }
    function resolveStaff(staffId) {
      const session = getSession(); if (!session || !staffId) return null;
      const me = getProviders().find(p => p.id === session.id);
      const arr = me?.profile?.staffs; if (!Array.isArray(arr)) return null;
      return arr.find(s => s.id === staffId) || null;
    }
    function populateStaffOptions() {
      const wrap = document.getElementById('staff-checkboxes'); if (!wrap) return;
      const session = getSession();
      if (!session) { wrap.textContent = ''; const span = document.createElement('span'); span.className = 'muted'; span.textContent = 'スタッフがいません'; wrap.appendChild(span); return; }
      const me = getProviders().find(p => p.id === session.id);
      const list = Array.isArray(me?.profile?.staffs) ? me.profile.staffs : [];
      wrap.textContent = '';
      for (const s of list) {
        const label = document.createElement('label'); label.className = 'cluster'; label.style.alignItems = 'center'; label.style.gap = '8px';
        const input = document.createElement('input'); input.type = 'checkbox'; input.name = 'staffIds'; input.value = String(s.id);
        const span = document.createElement('span'); span.textContent = s.name || '';
        if (s.role) span.textContent += `（${s.role}）`;
        label.appendChild(input); label.appendChild(span); wrap.appendChild(label);
      }
    }

    // ---- Option checkboxes ----
    function populateOptionCheckboxes() {
      const wrap = document.getElementById('options-checkboxes'); if (!wrap) return;
      const opts = loadOptions().filter(o => o && o.active);
      if (!opts.length) { wrap.textContent = ''; const span = document.createElement('span'); span.className = 'muted'; span.textContent = '登録されたオプションはありません'; wrap.appendChild(span); return; }
      wrap.textContent = '';
      for (const o of opts) {
        const label = document.createElement('label'); label.style.display = 'flex'; label.style.gap = '12px'; label.style.alignItems = 'flex-start';
        const input = document.createElement('input'); input.type = 'checkbox'; input.name = 'optionIds'; input.value = String(o.id);
        const div = document.createElement('div'); div.style.lineHeight = '1.2';
        const nameDiv = document.createElement('div'); nameDiv.style.fontWeight = '700'; nameDiv.textContent = o.name || '';
        const priceDiv = document.createElement('div'); priceDiv.style.color = 'var(--muted)'; priceDiv.style.fontSize = '13px'; priceDiv.textContent = o.price ? '¥' + Number(o.price).toLocaleString() : '';
        const descDiv = document.createElement('div'); descDiv.style.color = 'var(--muted)'; descDiv.style.fontSize = '13px'; descDiv.textContent = o.description ? String(o.description) : '';
        div.appendChild(nameDiv); div.appendChild(priceDiv); div.appendChild(descDiv);
        label.appendChild(input); label.appendChild(div); wrap.appendChild(label);
      }
    }

    // ---- Q&A item helpers ----
    function addQaItem(host, qInit = '', aInit = '') {
      try {
        const item = document.createElement('div'); item.className = 'qa-item card'; item.style.padding = '8px';
        const q = document.createElement('input'); q.type = 'text'; q.className = 'qa-q'; q.placeholder = '質問（例：初回の所要時間は？）'; q.value = qInit;
        const a = document.createElement('textarea'); a.rows = 3; a.className = 'qa-a'; a.placeholder = '回答（例：初回は60〜90分。目的整理→説明→提案→確認を行います。）'; a.value = aInit;
        const ops = document.createElement('div'); ops.className = 'cluster'; ops.style.justifyContent = 'flex-end';
        const del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-ghost'; del.textContent = '削除'; del.addEventListener('click', () => item.remove());
        ops.appendChild(del); item.appendChild(q); item.appendChild(a); item.appendChild(ops); host.appendChild(item);
      } catch {}
    }

    // ---- Modal open/close ----
    function openServiceModal() {
      const modal = document.getElementById('service-modal'); const backdrop = document.getElementById('service-modal-backdrop');
      if (modal) { modal.hidden = false; requestAnimationFrame(() => modal.classList.add('is-open')); }
      if (backdrop) { backdrop.hidden = false; requestAnimationFrame(() => backdrop.classList.add('is-open')); }
      document.body.classList.add('modal-open');
    }
    function closeServiceModal() {
      const modal = document.getElementById('service-modal'); const backdrop = document.getElementById('service-modal-backdrop');
      if (modal) modal.classList.remove('is-open');
      if (backdrop) backdrop.classList.remove('is-open');
      setTimeout(() => { if (modal) modal.hidden = true; if (backdrop) backdrop.hidden = true; }, 200);
      document.body.classList.remove('modal-open');
    }

    // ---- Render list ----
    function renderList() {
      const session = getSession(); const tbody = document.getElementById('provider-services-tbody');
      if (!tbody || !session) return;
      const all = loadServices();
      for (const s of all) {
        if (typeof s.published === 'undefined') s.published = false;
        if (typeof s.price === 'undefined' && typeof s.priceMin !== 'undefined') s.price = s.priceMin;
      }
      saveServices(all);
      const mine = all.filter(s => s.providerId === session.id);
      tbody.textContent = '';
      for (const s of mine) {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td'); tdName.setAttribute('data-label', 'サービス名'); tdName.textContent = s.name || ''; tr.appendChild(tdName);
        const tdRegion = document.createElement('td'); tdRegion.setAttribute('data-label', '地域'); tdRegion.textContent = regionLabel(s.region) || ''; tr.appendChild(tdRegion);
        const tdCat = document.createElement('td'); tdCat.setAttribute('data-label', 'カテゴリ'); tdCat.textContent = categoryLabel(s.category) || ''; tr.appendChild(tdCat);
        const tdPurpose = document.createElement('td'); tdPurpose.setAttribute('data-label', '目的'); tdPurpose.textContent = purposeLabel(s.purpose || '') || ''; tr.appendChild(tdPurpose);
        const tdPrice = document.createElement('td'); tdPrice.setAttribute('data-label', '料金'); tdPrice.textContent = `¥${Number((s.price != null ? s.price : s.priceMin) || 0).toLocaleString()}`; tr.appendChild(tdPrice);
        const tdPub = document.createElement('td'); tdPub.setAttribute('data-label', '公開'); tdPub.textContent = s.published ? '公開' : '非公開'; tr.appendChild(tdPub);
        const tdCreated = document.createElement('td'); tdCreated.setAttribute('data-label', '作成日'); tdCreated.textContent = new Date(s.createdAt).toLocaleString(); tr.appendChild(tdCreated);
        const tdOps = document.createElement('td'); tdOps.setAttribute('data-label', '操作'); tdOps.className = 'cluster';
        const btnEdit = document.createElement('button'); btnEdit.className = 'btn btn-ghost'; btnEdit.setAttribute('data-action', 'edit'); btnEdit.setAttribute('data-id', s.id); btnEdit.textContent = '編集';
        const btnToggle = document.createElement('button'); btnToggle.className = 'btn btn-ghost'; btnToggle.setAttribute('data-action', 'toggle-pub'); btnToggle.setAttribute('data-id', s.id); btnToggle.textContent = s.published ? '非公開にする' : '公開する';
        const btnDelete = document.createElement('button'); btnDelete.className = 'btn btn-ghost danger'; btnDelete.setAttribute('data-action', 'delete'); btnDelete.setAttribute('data-id', s.id); btnDelete.textContent = '削除';
        tdOps.appendChild(btnEdit); tdOps.appendChild(btnToggle); tdOps.appendChild(btnDelete); tr.appendChild(tdOps);
        tbody.appendChild(tr);
      }
    }

    // ---- Improvement score ----
    function improvementScore(s) {
      let score = 0;
      const fsLen = String(s.firstSessionPlan || '').length;
      const rpLen = String(s.riskPolicy || '').length;
      const qaCnt = Array.isArray(s.qaList) ? s.qaList.filter(it => it && it.q && it.a).length : 0;
      const descLen = String(s.description || '').length;
      if (fsLen < 80) score += 3;
      if (rpLen < 60) score += 2;
      if (qaCnt === 0) score += 3; else if (qaCnt < 2) score += 2;
      if (descLen < 150) score += 2;
      return score;
    }

    // ---- Load to form ----
    function loadToForm(item) {
      const form = document.getElementById('provider-service-form'); if (!form) return;
      $('#serviceId').value = item.id;
      $('#serviceName').value = item.name;
      $('#region').value = item.region;
      $('#category').value = item.category;
      $('#purpose').value = item.purpose || '';
      $('#price').value = (item.price != null ? item.price : item.priceMin) || 0;
      $('#catchcopy').value = item.catchcopy || '';
      $('#description').value = item.description || '';
      $('#firstSessionPlan').value = item.firstSessionPlan || '';
      $('#riskPolicy').value = item.riskPolicy || '';
      const ids = Array.isArray(item.staffIds) ? item.staffIds : (item.staffId ? [item.staffId] : []);
      const boxWrap = document.getElementById('staff-checkboxes');
      if (boxWrap) { for (const input of Array.from(boxWrap.querySelectorAll('input[type="checkbox"]'))) { if (input instanceof HTMLInputElement) input.checked = ids.includes(input.value); } }
      const optIds = Array.isArray(item.optionIds) ? item.optionIds : [];
      const optWrap = document.getElementById('options-checkboxes');
      if (optWrap) { for (const input of Array.from(optWrap.querySelectorAll('input[type="checkbox"]'))) { if (input instanceof HTMLInputElement) input.checked = optIds.includes(input.value); } }
      $('#published').checked = !!item.published;
      try {
        const host = document.getElementById('qa-list');
        if (host) { host.textContent = ''; const arr = Array.isArray(item.qaList) ? item.qaList : []; for (const qa of arr) addQaItem(host, qa.q || '', qa.a || ''); }
      } catch {}
      const prev = document.getElementById('photo-preview');
      if (prev instanceof HTMLImageElement) { if (item.photo) { prev.src = item.photo; prev.style.display = 'block'; } else { prev.src = ''; prev.style.display = 'none'; } }
      try {
        const ghost = document.getElementById('gallery-preview');
        if (ghost) {
          ghost.textContent = '';
          const gallery = Array.isArray(item.gallery) ? item.gallery : (item.photos ? item.photos : []);
          for (const url of gallery) {
            const img = document.createElement('img'); img.src = url; img.setAttribute('data-src', url); img.style.maxWidth = '120px'; img.style.maxHeight = '90px'; img.style.borderRadius = '6px'; img.style.objectFit = 'cover';
            const wrap = document.createElement('div'); wrap.className = 'gallery-item';
            const del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-ghost'; del.textContent = '削除'; del.addEventListener('click', () => wrap.remove());
            wrap.appendChild(img); wrap.appendChild(del); ghost.appendChild(wrap);
          }
          try { attachGalleryHandlers(ghost); } catch {}
        }
      } catch {}
      const submit = document.getElementById('service-submit'); if (submit) submit.textContent = '更新';
      openServiceModal();
    }

    // ---- Reset form ----
    function resetForm() {
      const form = document.getElementById('provider-service-form'); const msg = document.getElementById('service-message');
      if (form instanceof HTMLFormElement) form.reset();
      const idEl = document.getElementById('serviceId'); if (idEl instanceof HTMLInputElement) idEl.value = '';
      const purposeEl = document.getElementById('purpose'); if (purposeEl instanceof HTMLSelectElement) purposeEl.value = '';
      const submit = document.getElementById('service-submit'); if (submit) submit.textContent = '保存';
      if (msg) msg.textContent = '';
      const prev2 = document.getElementById('photo-preview'); if (prev2 instanceof HTMLImageElement) { prev2.src = ''; prev2.style.display = 'none'; }
      const qaHost = document.getElementById('qa-list'); if (qaHost) qaHost.textContent = '';
    }

    // ---- Submit handler ----
    function onSubmit(e) {
      e.preventDefault();
      const session = getSession(); if (!session) { location.href = '/pages/login.html'; return; }
      const form = e.currentTarget; const msg = document.getElementById('service-message');
      const fd = new FormData(form);
      const id = (fd.get('serviceId') || '').toString();
      const name = (fd.get('serviceName') || '').toString().trim();
      const region = (fd.get('region') || '').toString();
      const category = (fd.get('category') || '').toString();
      const purpose = (fd.get('purpose') || '').toString();
      const price = Number(fd.get('price') || 0);
      const catchcopy = (fd.get('catchcopy') || '').toString().trim();
      const description = (fd.get('description') || '').toString();
      const firstSessionPlan = (fd.get('firstSessionPlan') || '').toString();
      const riskPolicy = (fd.get('riskPolicy') || '').toString();
      const staffIds = Array.from(document.querySelectorAll('#staff-checkboxes input[type="checkbox"]:checked')).map(el => el instanceof HTMLInputElement ? el.value : '').filter(Boolean);
      const published = fd.get('published') ? true : false;
      const optionIds = Array.from(document.querySelectorAll('#options-checkboxes input[type="checkbox"]:checked')).map(el => el instanceof HTMLInputElement ? el.value : '').filter(Boolean);
      if (!name || !region || !category || isNaN(price)) { if (msg) msg.textContent = '入力内容を確認してください。'; return; }
      const staffInfos = staffIds.map(sid => resolveStaff(sid)).filter(Boolean);
      const staffNames = staffInfos.map(s => s.name);

      function collectGalleryUrls() {
        const host = document.getElementById('gallery-preview'); if (!host) return [];
        return Array.from(host.querySelectorAll('.gallery-item img[data-src]')).map(img => img.getAttribute('data-src') || '').filter(Boolean);
      }
      function collectQaList() {
        const host = document.getElementById('qa-list'); if (!host) return [];
        return Array.from(host.querySelectorAll('.qa-item')).reduce((out, it) => {
          const qEl = it.querySelector('.qa-q'); const aEl = it.querySelector('.qa-a');
          const q = (qEl instanceof HTMLInputElement) ? qEl.value.trim() : '';
          const a = (aEl instanceof HTMLTextAreaElement) ? aEl.value.trim() : '';
          if (q && a) out.push({ q, a }); return out;
        }, []);
      }

      const handleSave = (photoDataUrl, galleryUrls) => {
        const all = loadServices();
        if (id) {
          const idx = all.findIndex(s => s.id === id && s.providerId === session.id);
          if (idx === -1) { if (msg) msg.textContent = '編集対象が見つかりません。'; return; }
          all[idx] = { ...all[idx], name, region, category, purpose, price, catchcopy, description, firstSessionPlan, riskPolicy, qaList: collectQaList(), staffIds, staffNames, published, optionIds };
          if (photoDataUrl !== undefined) all[idx].photo = photoDataUrl;
          if (Array.isArray(galleryUrls)) all[idx].gallery = galleryUrls;
        } else {
          all.push({ id: uuid(), providerId: session.id, name, region, category, purpose, price, catchcopy, description, firstSessionPlan, riskPolicy, qaList: collectQaList(), staffIds, staffNames, published, optionIds, photo: photoDataUrl || '', gallery: Array.isArray(galleryUrls) ? galleryUrls : [], createdAt: new Date().toISOString() });
        }
        saveServices(all); resetForm(); if (msg) msg.textContent = '保存しました。'; renderList(); closeServiceModal();
      };

      const photoEl = document.getElementById('photo');
      const file = (photoEl instanceof HTMLInputElement && photoEl.files) ? photoEl.files[0] : null;
      const galleryEl = document.getElementById('gallery');
      const galleryFiles = (galleryEl instanceof HTMLInputElement && galleryEl.files) ? Array.from(galleryEl.files) : [];
      if (file) {
        if (galleryFiles.length) {
          Promise.all(galleryFiles.map(f => resizeImageFile(f, 1200))).then(galleryUrls => {
            const merged = Array.from(new Set([].concat(collectGalleryUrls(), galleryUrls)));
            resizeImageFile(file, 1200).then(url => handleSave(url, merged));
          });
        } else { resizeImageFile(file, 1200).then(url => handleSave(url, collectGalleryUrls())); }
      } else {
        if (galleryFiles.length) {
          Promise.all(galleryFiles.map(f => resizeImageFile(f, 1200))).then(galleryUrls => {
            const merged = Array.from(new Set([].concat(collectGalleryUrls(), galleryUrls)));
            handleSave(id ? undefined : '', merged);
          });
        } else { handleSave(id ? undefined : '', collectGalleryUrls()); }
      }
    }

    // ---- Table click handler ----
    function onTableClick(e) {
      const btn = e.target.closest('button[data-action]'); if (!btn) return;
      const id = btn.getAttribute('data-id'); const all = loadServices(); const idx = all.findIndex(s => s.id === id);
      if (idx === -1) return;
      const action = btn.getAttribute('data-action');
      if (action === 'delete') {
        if (!confirm('このサービスを削除しますか？')) return; all.splice(idx, 1); saveServices(all); renderList();
      } else if (action === 'edit') {
        populateStaffOptions(); populateOptionCheckboxes(); loadToForm(all[idx]);
      } else if (action === 'toggle-pub') {
        all[idx].published = !all[idx].published; saveServices(all); renderList();
      }
    }

    // ---- Import ----
    async function importServicesFile(e) {
      const input = e.target;
      const file = (input instanceof HTMLInputElement && input.files) ? input.files[0] : null;
      if (!file) return;
      try {
        const text = await file.text(); const arr = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error('invalid');
        const session = getSession();
        if (!session) { alert('セッションが切れています。再ログインしてください。'); input.value = ''; return; }
        const current = loadServices(); const byId = new Map(current.map(s => [s.id, s]));
        let added = 0, updated = 0, skipped = 0; const now = new Date().toISOString();
        for (const s of arr) {
          if (!s || typeof s !== 'object') { skipped++; continue; }
          const providerId = s.providerId || session.id;
          if (providerId !== session.id) { skipped++; continue; }
          if (!s.name || !s.region || !s.category) { skipped++; continue; }
          if (s.id && byId.has(s.id)) {
            const existing = byId.get(s.id); const merged = { ...existing, ...s, id: existing.id, providerId: session.id, createdAt: existing.createdAt || now };
            const idx = current.findIndex(x => x.id === existing.id); if (idx !== -1) { current[idx] = merged; updated++; }
          } else {
            current.push({ id: uuid(), providerId: session.id, name: s.name, region: s.region, category: s.category, purpose: s.purpose || '', price: Number(s.price != null ? s.price : (s.priceMin != null ? s.priceMin : 0)) || 0, catchcopy: String(s.catchcopy || ''), description: String(s.description || ''), firstSessionPlan: String(s.firstSessionPlan || ''), riskPolicy: String(s.riskPolicy || ''), qaList: Array.isArray(s.qaList) ? s.qaList.filter(it => it && it.q && it.a) : [], staffIds: Array.isArray(s.staffIds) ? s.staffIds : (s.staffId ? [s.staffId] : []), staffNames: Array.isArray(s.staffNames) ? s.staffNames : [], photo: String(s.photo || ''), published: !!s.published, createdAt: now }); added++;
          }
        }
        saveServices(current); renderList(); alert(`インポートしました。追加:${added}件 / 更新:${updated}件 / スキップ:${skipped}件`);
      } catch { alert('インポートに失敗しました。JSON形式をご確認ください。'); }
      finally { const input2 = document.getElementById('services-import-input'); if (input2 instanceof HTMLInputElement) input2.value = ''; }
    }

    // ---- admin-options.js logic ----
    function renderOptionsList() {
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
    function openOptionModal() {
      const modal = document.getElementById('option-modal'); if (!modal) return;
      modal.hidden = false; modal.style.display = 'block'; document.body.classList.add('modal-open');
    }
    function closeOptionModal() {
      const modal = document.getElementById('option-modal'); if (!modal) return;
      modal.hidden = true; modal.style.display = 'none'; document.body.classList.remove('modal-open');
    }
    function populateOptionForm(opt) {
      document.getElementById('option-id').value = opt ? opt.id : '';
      document.getElementById('option-name').value = opt ? opt.name : '';
      document.getElementById('option-price').value = opt && typeof opt.price !== 'undefined' ? opt.price : '';
      document.getElementById('option-desc').value = opt ? opt.description : '';
      document.getElementById('option-active').checked = opt ? !!opt.active : true;
    }

    // ---- provider-options-list.js logic ----
    function renderOptionsListModal() {
      const tbody = document.getElementById('options-list-tbody'); if (!tbody) return;
      const all = loadOptions(); tbody.textContent = '';
      for (const o of all) {
        const tr = document.createElement('tr'); tr.dataset.id = o.id;
        const tdName = document.createElement('td'); tdName.textContent = o.name || ''; tr.appendChild(tdName);
        const tdPrice = document.createElement('td'); tdPrice.textContent = o.price ? '¥' + Number(o.price).toLocaleString() : ''; tr.appendChild(tdPrice);
        const tdDesc = document.createElement('td'); tdDesc.textContent = o.description || ''; tr.appendChild(tdDesc);
        const tdActive = document.createElement('td'); tdActive.textContent = o.active ? 'はい' : 'いいえ'; tr.appendChild(tdActive);
        const tdOps = document.createElement('td'); tdOps.className = 'cluster';
        const btnEdit = document.createElement('button'); btnEdit.className = 'btn btn-ghost'; btnEdit.setAttribute('data-action', 'edit'); btnEdit.setAttribute('data-id', o.id); btnEdit.textContent = '編集';
        const btnDel = document.createElement('button'); btnDel.className = 'btn btn-ghost danger'; btnDel.setAttribute('data-action', 'delete'); btnDel.setAttribute('data-id', o.id); btnDel.textContent = '削除';
        tdOps.appendChild(btnEdit); tdOps.appendChild(btnDel); tr.appendChild(tdOps); tbody.appendChild(tr);
      }
    }
    function openOptionsListModal() {
      const modal = document.getElementById('options-list-modal'); if (!modal) return;
      modal.hidden = false; modal.style.display = 'block'; document.body.classList.add('modal-open');
    }
    function closeOptionsListModal() {
      const modal = document.getElementById('options-list-modal'); if (!modal) return;
      modal.hidden = true; modal.style.display = 'none'; document.body.classList.remove('modal-open');
    }
    function insertEditRow(id) {
      const existing = document.getElementById('options-edit-row'); if (existing) existing.remove();
      const tr = document.querySelector(`tr[data-id="${id}"]`); if (!tr) return;
      const all = loadOptions(); const o = all.find(x => x.id === id);
      const edit = document.createElement('tr'); edit.id = 'options-edit-row';
      const td = document.createElement('td'); td.setAttribute('colspan', '5');
      const form = document.createElement('form'); form.id = 'option-inline-form'; form.style.display = 'flex'; form.style.gap = '12px'; form.style.alignItems = 'center';
      const labelName = document.createElement('label'); labelName.style.flex = '2'; labelName.textContent = '名称'; const inputName = document.createElement('input'); inputName.name = 'name'; inputName.required = true; inputName.value = o.name || ''; labelName.appendChild(inputName);
      const labelPrice = document.createElement('label'); labelPrice.style.flex = '1'; labelPrice.textContent = '価格'; const inputPrice = document.createElement('input'); inputPrice.name = 'price'; inputPrice.type = 'number'; inputPrice.min = '0'; inputPrice.step = '1'; inputPrice.value = typeof o.price !== 'undefined' ? String(o.price) : ''; labelPrice.appendChild(inputPrice);
      const labelDesc = document.createElement('label'); labelDesc.style.flex = '3'; labelDesc.textContent = '説明'; const inputDesc = document.createElement('input'); inputDesc.name = 'description'; inputDesc.value = o.description || ''; labelDesc.appendChild(inputDesc);
      const labelActive = document.createElement('label'); labelActive.style.flex = '1'; labelActive.style.display = 'flex'; labelActive.style.alignItems = 'center'; labelActive.style.gap = '8px'; const inputActive = document.createElement('input'); inputActive.type = 'checkbox'; inputActive.name = 'active'; inputActive.checked = !!o.active; labelActive.appendChild(inputActive); labelActive.appendChild(document.createTextNode(' 有効'));
      const opsDiv = document.createElement('div'); opsDiv.style.flex = '0 0 auto'; opsDiv.style.display = 'flex'; opsDiv.style.gap = '8px';
      const saveBtn = document.createElement('button'); saveBtn.className = 'btn'; saveBtn.type = 'submit'; saveBtn.textContent = '保存';
      const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn btn-ghost'; cancelBtn.type = 'button'; cancelBtn.id = 'option-inline-cancel'; cancelBtn.textContent = 'キャンセル';
      opsDiv.appendChild(saveBtn); opsDiv.appendChild(cancelBtn);
      form.appendChild(labelName); form.appendChild(labelPrice); form.appendChild(labelDesc); form.appendChild(labelActive); form.appendChild(opsDiv);
      td.appendChild(form); edit.appendChild(td); tr.insertAdjacentElement('afterend', edit);
      document.getElementById('option-inline-form').addEventListener('submit', (e) => {
        e.preventDefault(); const fd = new FormData(form);
        const name = (fd.get('name') || '').toString().trim();
        const price = fd.get('price') !== null && fd.get('price') !== '' ? Number(fd.get('price')) : 0;
        const desc = (fd.get('description') || '').toString();
        const active = !!fd.get('active');
        if (!name) { alert('名前を入力してください'); return; }
        updateOption(id, { name, price, description: desc, active });
        window.dispatchEvent(new CustomEvent('options:changed'));
        renderOptionsListModal(); const er = document.getElementById('options-edit-row'); if (er) er.remove();
      });
      document.getElementById('option-inline-cancel')?.addEventListener('click', () => { const er = document.getElementById('options-edit-row'); if (er) er.remove(); });
    }

    // ---- Wire up all event listeners ----

    // Service form
    const form = document.getElementById('provider-service-form');
    if (form) form.addEventListener('submit', onSubmit);
    const tbody = document.getElementById('provider-services-tbody');
    if (tbody) tbody.addEventListener('click', onTableClick);
    const importInput = document.getElementById('services-import-input');
    if (importInput) importInput.addEventListener('change', importServicesFile);
    const cancel = document.getElementById('service-cancel');
    if (cancel) cancel.addEventListener('click', () => { resetForm(); closeServiceModal(); });
    const openBtn = document.getElementById('open-service-modal-btn');
    if (openBtn) openBtn.addEventListener('click', () => { resetForm(); populateStaffOptions(); populateOptionCheckboxes(); openServiceModal(); });
    const closeBtn = document.getElementById('service-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeServiceModal);
    const backdrop = document.getElementById('service-modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeServiceModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeServiceModal(); });

    // Photo preview
    const photoInput = document.getElementById('photo');
    const photoClear = document.getElementById('photo-clear');
    const prev = document.getElementById('photo-preview');
    if (photoInput) {
      photoInput.addEventListener('change', async (e) => {
        const file = (e.target instanceof HTMLInputElement && e.target.files) ? e.target.files[0] : null;
        if (!file) return;
        const url = await resizeImageFile(file, 1200);
        if (prev instanceof HTMLImageElement) { prev.src = url; prev.style.display = url ? 'block' : 'none'; }
      });
    }
    if (photoClear) {
      photoClear.addEventListener('click', () => {
        const inp = document.getElementById('photo'); if (inp instanceof HTMLInputElement) inp.value = '';
        if (prev instanceof HTMLImageElement) { prev.src = ''; prev.style.display = 'none'; }
      });
    }

    // Gallery input
    const galleryInput = document.getElementById('gallery');
    const galleryPreview = document.getElementById('gallery-preview');
    if (galleryInput && galleryPreview) {
      galleryInput.addEventListener('change', async (e) => {
        const files = (e.target instanceof HTMLInputElement && e.target.files) ? Array.from(e.target.files) : [];
        if (!files.length) return;
        const urls = await Promise.all(files.map(f => resizeImageFile(f, 1200)));
        for (const u of urls) {
          const img = document.createElement('img'); img.src = u; img.setAttribute('data-src', u); img.style.maxWidth = '120px'; img.style.maxHeight = '90px'; img.style.borderRadius = '6px'; img.style.objectFit = 'cover';
          const wrap = document.createElement('div'); wrap.className = 'gallery-item';
          const del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-ghost'; del.textContent = '削除'; del.addEventListener('click', () => wrap.remove());
          wrap.appendChild(img); wrap.appendChild(del); galleryPreview.appendChild(wrap);
        }
        try { attachGalleryHandlers(galleryPreview); } catch {}
      });
    }

    // Q&A add button
    const qaAdd = document.getElementById('qa-add-btn'); const qaHost = document.getElementById('qa-list');
    if (qaAdd && qaHost) qaAdd.addEventListener('click', () => addQaItem(qaHost));

    // Auto export toggle
    try {
      const key = 'glowup:services:autoExport'; const cb = document.getElementById('services-auto-export');
      if (cb instanceof HTMLInputElement) {
        const saved = localStorage.getItem(key);
        cb.checked = saved === null ? false : saved === '1';
        if (saved === null) localStorage.setItem(key, '0');
        cb.addEventListener('change', () => localStorage.setItem(key, cb.checked ? '1' : '0'));
      }
    } catch {}

    // admin-options.js wiring
    const openOptionModal1 = document.getElementById('open-option-modal');
    if (openOptionModal1) openOptionModal1.addEventListener('click', () => { populateOptionForm(null); openOptionModal(); });
    const openOptionModalTop = document.getElementById('open-option-modal-top');
    if (openOptionModalTop) openOptionModalTop.addEventListener('click', () => { populateOptionForm(null); openOptionModal(); });
    const openAdminOptions = document.getElementById('open-admin-options');
    if (openAdminOptions) openAdminOptions.addEventListener('click', () => { populateOptionForm(null); openOptionModal(); });
    const optionCancel = document.getElementById('option-cancel');
    if (optionCancel) optionCancel.addEventListener('click', closeOptionModal);
    const optionsTbody = document.getElementById('options-tbody');
    if (optionsTbody) {
      optionsTbody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]'); if (!btn) return;
        const action = btn.getAttribute('data-action'); const id = btn.getAttribute('data-id');
        if (action === 'edit') { const all = loadOptions(); const o = all.find(x => x.id === id); populateOptionForm(o); openOptionModal(); }
        else if (action === 'delete') { if (!confirm('このオプションを削除しますか？')) return; deleteOption(id); renderOptionsList(); }
      });
    }
    const optionForm = document.getElementById('option-form');
    if (optionForm) {
      optionForm.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const id = document.getElementById('option-id').value || '';
        const name = document.getElementById('option-name').value.trim();
        const priceVal = document.getElementById('option-price').value;
        const price = priceVal !== '' ? Number(priceVal) : 0;
        const desc = document.getElementById('option-desc').value || '';
        const active = !!document.getElementById('option-active').checked;
        if (!name) { alert('名前を入力してください'); return; }
        if (id) updateOption(id, { name, price, description: desc, active });
        else createOption({ name, price, description: desc, active });
        renderOptionsList();
        try { window.dispatchEvent(new CustomEvent('options:changed')); } catch {}
        closeOptionModal();
      });
    }

    // provider-options-list.js wiring
    const openListBtn = document.getElementById('open-options-list-btn');
    if (openListBtn) openListBtn.addEventListener('click', () => { renderOptionsListModal(); openOptionsListModal(); });
    const optionsListTbody = document.getElementById('options-list-tbody');
    if (optionsListTbody) {
      optionsListTbody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]'); if (!btn) return;
        const action = btn.getAttribute('data-action'); const id = btn.getAttribute('data-id');
        if (action === 'edit') insertEditRow(id);
        else if (action === 'delete') { if (!confirm('このオプションを削除しますか？')) return; deleteOption(id); window.dispatchEvent(new CustomEvent('options:changed')); renderOptionsListModal(); }
      });
    }
    const optionsListClose = document.getElementById('options-list-close');
    if (optionsListClose) optionsListClose.addEventListener('click', closeOptionsListModal);
    window.addEventListener('options:changed', () => { renderOptionsListModal(); populateOptionCheckboxes(); });

    // Initial renders
    renderList();
    populateStaffOptions();
    populateOptionCheckboxes();
    renderOptionsList();
    renderOptionsListModal();
    try { window.addEventListener('options:changed', () => populateOptionCheckboxes()); } catch {}

    // ?select= URL param handling
    try {
      const url = new URL(location.href);
      const sel = url.searchParams.get('select');
      const focusParam = url.searchParams.get('focus');
      const hash = String(location.hash || '');
      const mHash = hash.match(/focus=([^&]+)/);
      const focusTarget = focusParam || (mHash ? decodeURIComponent(mHash[1]) : '');
      if (sel) {
        const session = getSession(); const all = loadServices();
        const mine = session ? all.filter(s => s.providerId === session.id) : [];
        let targetService = null;
        if (sel === 'auto') {
          targetService = mine.sort((a, b) => {
            const sa = improvementScore(a), sb = improvementScore(b);
            if (sb !== sa) return sb - sa;
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          })[0] || null;
        } else { targetService = mine.find(s => String(s.id) === String(sel)) || null; }
        openServiceModal();
        if (targetService) loadToForm(targetService);
        if (focusTarget) {
          if (focusTarget === 'qa-list') {
            const host = document.getElementById('qa-list'); if (host) { addQaItem(host); const firstQ = host.querySelector('.qa-item .qa-q'); if (firstQ instanceof HTMLElement) firstQ.focus(); }
          } else {
            const el = document.getElementById(focusTarget);
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (el instanceof HTMLElement) { try { el.focus(); } catch {} el.style.outline = '2px solid var(--primary)'; setTimeout(() => { el.style.outline = ''; }, 2000); } }
          }
        }
      }
    } catch {}

    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: '800px' }}>
        <h1 className="section-title">サービス</h1>
        <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="cluster" style={{ gap: '8px', flexWrap: 'wrap' }}>
            <button id="open-service-modal-btn" className="btn" type="button">新規サービスを追加</button>
            <label htmlFor="services-import-input" className="btn btn-ghost" style={{ margin: 0 }}>インポート</label>
            <input id="services-import-input" type="file" accept="application/json" style={{ display: 'none' }} />
            <button id="open-options-list-btn" className="btn">オプション一覧</button>
            <button id="open-option-modal-top" className="btn btn-ghost">新規オプションを追加</button>
          </div>
          <label className="cluster" style={{ alignItems: 'center', gap: '8px' }}>
            <input id="services-auto-export" type="checkbox" />
            <span className="muted">保存時に自動バックアップ（ダウンロード）</span>
          </label>
        </div>

        {/* Modal: Service Form */}
        <div id="service-modal-backdrop" className="modal-backdrop" hidden></div>
        <div id="service-modal" className="modal" role="dialog" aria-modal="true" aria-labelledby="service-modal-title" hidden>
          <div className="modal-content card" style={{ padding: '24px', maxWidth: '800px', width: '100%' }}>
            <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 id="service-modal-title" style={{ margin: 0 }}>サービス登録・編集</h2>
              <button id="service-modal-close" className="btn btn-ghost" type="button" aria-label="閉じる">×</button>
            </div>
            <form id="provider-service-form">
              <div className="stack">
                <input type="hidden" id="serviceId" name="serviceId" />
                <label>サービス名<input id="serviceName" name="serviceName" type="text" placeholder="サービス名" required /></label>
                <label>地域
                  <select id="region" name="region" required>
                    <option value="hokkaido">北海道</option>
                    <option value="aomori">青森県</option>
                    <option value="iwate">岩手県</option>
                    <option value="miyagi">宮城県</option>
                    <option value="akita">秋田県</option>
                    <option value="yamagata">山形県</option>
                    <option value="fukushima">福島県</option>
                    <option value="ibaraki">茨城県</option>
                    <option value="tochigi">栃木県</option>
                    <option value="gunma">群馬県</option>
                    <option value="saitama">埼玉県</option>
                    <option value="chiba">千葉県</option>
                    <option value="tokyo">東京都</option>
                    <option value="kanagawa">神奈川県</option>
                    <option value="niigata">新潟県</option>
                    <option value="toyama">富山県</option>
                    <option value="ishikawa">石川県</option>
                    <option value="fukui">福井県</option>
                    <option value="yamanashi">山梨県</option>
                    <option value="nagano">長野県</option>
                    <option value="gifu">岐阜県</option>
                    <option value="shizuoka">静岡県</option>
                    <option value="aichi">愛知県</option>
                    <option value="mie">三重県</option>
                    <option value="shiga">滋賀県</option>
                    <option value="kyoto">京都府</option>
                    <option value="osaka">大阪府</option>
                    <option value="hyogo">兵庫県</option>
                    <option value="nara">奈良県</option>
                    <option value="wakayama">和歌山県</option>
                    <option value="tottori">鳥取県</option>
                    <option value="shimane">島根県</option>
                    <option value="okayama">岡山県</option>
                    <option value="hiroshima">広島県</option>
                    <option value="yamaguchi">山口県</option>
                    <option value="tokushima">徳島県</option>
                    <option value="kagawa">香川県</option>
                    <option value="ehime">愛媛県</option>
                    <option value="kochi">高知県</option>
                    <option value="fukuoka">福岡県</option>
                    <option value="saga">佐賀県</option>
                    <option value="nagasaki">長崎県</option>
                    <option value="kumamoto">熊本県</option>
                    <option value="oita">大分県</option>
                    <option value="miyazaki">宮崎県</option>
                    <option value="kagoshima">鹿児島県</option>
                    <option value="okinawa">沖縄県</option>
                  </select>
                </label>
                <label>カテゴリ
                  <select id="category" name="category" required>
                    <option value="consulting">外見トータルサポート</option>
                    <option value="gym">パーソナルジム</option>
                    <option value="makeup">メイクアップ</option>
                    <option value="hair">ヘア</option>
                    <option value="diagnosis">カラー/骨格診断</option>
                    <option value="fashion">コーデ提案</option>
                    <option value="photo">写真撮影（アプリ等）</option>
                    <option value="marriage">結婚相談所</option>
                    <option value="eyebrow">眉毛</option>
                    <option value="hairremoval">脱毛</option>
                    <option value="esthetic">エステ</option>
                    <option value="cosmetic">美容外科・美容クリニック</option>
                    <option value="whitening">ホワイトニング</option>
                    <option value="orthodontics">歯科矯正</option>
                    <option value="nail">ネイル</option>
                    <option value="aga">AGA</option>
                  </select>
                </label>
                <label>目的（任意）
                  <select id="purpose" name="purpose">
                    <option value="">選択しない</option>
                    <option value="first_impression">第一印象を変えたい</option>
                    <option value="profile_photo">プロフィール写真を良くしたい</option>
                    <option value="confidence">恋愛で自信を持ちたい</option>
                    <option value="body_shape">体を整えたい</option>
                    <option value="know_what_suits">自分に似合うものを知りたい</option>
                    <option value="total_update">トータルで磨く</option>
                  </select>
                </label>
                <label>料金<input id="price" name="price" type="number" min="0" step="1" placeholder="0" required /></label>
                <label>キャッチコピー
                  <input id="catchcopy" name="catchcopy" type="text" placeholder="例）初回限定！プロが外見をトータルサポート" maxLength={80} />
                </label>
                <label>サービス詳細
                  <textarea id="description" name="description" rows={5} placeholder="サービスの内容、所要時間、持ち物などを詳しく記載してください"></textarea>
                </label>
                <div className="stack">
                  <h3 style={{ margin: '8px 0 4px' }}>具体性の補強（推奨）</h3>
                  <label>初回の進め方（80〜150字推奨）
                    <textarea id="firstSessionPlan" name="firstSessionPlan" rows={3} placeholder="例：初回は目的を言語化し、選択肢を整理。納得できるまで説明→提案→確認を1〜2回繰り返した後、施術/サービスに入ります。"></textarea>
                  </label>
                  <label>失敗リスクへの向き合い方（60字以上推奨）
                    <textarea id="riskPolicy" name="riskPolicy" rows={3} placeholder="例：初回は大きな変化を避け、確認・修正の余地を残します。数字や写真で合意を取り、万一のズレは無償で調整します。"></textarea>
                  </label>
                  <div className="stack">
                    <label className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Q&A（よくある不安への回答を2件以上が目安）</span>
                      <button id="qa-add-btn" className="btn btn-ghost" type="button">Q&Aを追加</button>
                    </label>
                    <div id="qa-list" className="stack" style={{ gap: '8px' }}></div>
                  </div>
                </div>
                <div className="stack">
                  <label>ギャラリー（複数画像）
                    <input id="gallery" name="gallery" type="file" accept="image/*" multiple />
                  </label>
                  <div id="gallery-preview" className="cluster" style={{ gap: '8px', flexWrap: 'wrap' }}></div>
                  <p className="muted">複数の写真をアップロードして、サービスページにギャラリー表示できます（推奨最大長辺1200px）。</p>
                </div>
                <div className="stack" style={{ gap: '6px' }}>
                  <label>担当者（複数選択可・スタッフから選択）</label>
                  <div id="staff-checkboxes" className="stack" style={{ gap: '6px', maxHeight: '176px', overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px 12px', background: '#fff' }}></div>
                  <p className="muted">チェックボックスで複数の担当者を選択できます。スタッフの登録・編集は「スタッフプロフィール」タブから行えます。</p>
                </div>
                <div className="stack" style={{ gap: '6px' }}>
                  <label>利用可能なオプション（管理画面で登録されたオプション）</label>
                  <div id="options-checkboxes" className="stack" style={{ gap: '6px', maxHeight: '176px', overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '8px 12px', background: '#fff' }}></div>
                  <p className="muted">チェックでこのサービスに紐づけます。</p>
                </div>
                <div className="card" style={{ padding: '12px', marginTop: '12px' }}>
                  <div className="space-between" style={{ display: 'flex', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>オプション管理</h3>
                    <div className="cluster">
                      <button id="open-option-modal" className="btn">新しいオプションを追加</button>
                      <button id="open-admin-options" className="btn btn-ghost" style={{ display: 'none' }}>編集</button>
                    </div>
                  </div>
                  <p className="muted">ここでオプションを作成・編集できます。作成したオプションはこのページのチェックボックスに反映されます。</p>
                  <div className="table-responsive" style={{ marginTop: '8px' }}>
                    <table className="table" style={{ width: '100%' }}>
                      <thead><tr><th>名前</th><th>価格</th><th>説明</th><th>有効</th><th>操作</th></tr></thead>
                      <tbody id="options-tbody"></tbody>
                    </table>
                  </div>
                </div>
                <div className="stack">
                  <label>写真
                    <input id="photo" name="photo" type="file" accept="image/*" />
                  </label>
                  <div className="cluster" style={{ alignItems: 'flex-start' }}>
                    <img id="photo-preview" alt="写真プレビュー" style={{ maxWidth: '200px', maxHeight: '150px', display: 'none', borderRadius: '8px' }} />
                    <button id="photo-clear" type="button" className="btn btn-ghost">写真をクリア</button>
                  </div>
                  <p className="muted">画像は自動的に縮小（最大1200px）して保存されます。大きな画像は読み込みに時間がかかる場合があります。</p>
                </div>
                <label className="cluster" style={{ alignItems: 'center' }}>
                  <input id="published" name="published" type="checkbox" />
                  <span>公開する</span>
                </label>
                <div className="cluster">
                  <button id="service-submit" className="btn" type="submit">保存</button>
                  <button id="service-cancel" className="btn btn-ghost" type="button">編集をキャンセル</button>
                  <span id="service-message" className="muted" aria-live="polite"></span>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <div className="stack">
            <h2 style={{ margin: 0 }}>登録済みサービス一覧</h2>
            <div className="table-responsive">
              <table className="table responsive" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>サービス名</th>
                    <th style={{ textAlign: 'left' }}>地域</th>
                    <th style={{ textAlign: 'left' }}>カテゴリ</th>
                    <th style={{ textAlign: 'left' }}>目的</th>
                    <th style={{ textAlign: 'left' }}>料金</th>
                    <th style={{ textAlign: 'left' }}>公開</th>
                    <th style={{ textAlign: 'left' }}>作成日</th>
                    <th style={{ textAlign: 'left' }}>操作</th>
                  </tr>
                </thead>
                <tbody id="provider-services-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Options modal */}
      <div id="option-modal" className="modal" role="dialog" aria-modal="true" hidden style={{ display: 'none' }}>
        <div className="modal-content card" style={{ padding: '16px', maxWidth: '640px', margin: '40px auto' }}>
          <h2 id="option-modal-title">オプションを編集</h2>
          <form id="option-form" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
            <input type="hidden" id="option-id" />
            <label style={{ display: 'block' }}>名称
              <input id="option-name" required style={{ width: '100%' }} />
            </label>
            <label style={{ display: 'block' }}>価格（円、空白可）
              <input id="option-price" type="number" min="0" step="1" style={{ width: '160px' }} />
            </label>
            <label style={{ display: 'block' }}>説明
              <textarea id="option-desc" rows={3} style={{ width: '100%' }}></textarea>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><input id="option-active" type="checkbox" defaultChecked /> 有効</label>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button id="option-save" className="btn" type="submit">保存</button>
              <button id="option-cancel" className="btn btn-ghost" type="button">キャンセル</button>
            </div>
          </form>
        </div>
      </div>

      {/* Options List Modal */}
      <div id="options-list-modal" className="modal" role="dialog" aria-modal="true" hidden style={{ display: 'none' }}>
        <div className="modal-content card" style={{ padding: '16px', maxWidth: '840px', margin: '40px auto', width: 'calc(100% - 48px)' }}>
          <div className="space-between" style={{ display: 'flex', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>オプション一覧</h2>
            <div className="cluster">
              <button id="options-list-close" className="btn btn-ghost">閉じる</button>
            </div>
          </div>
          <p className="muted">登録済みのオプションを一覧できます。編集ボタンを押すと下に編集フォームが展開します。</p>
          <div className="table-responsive" style={{ marginTop: '8px' }}>
            <table className="table" style={{ width: '100%' }}>
              <thead><tr><th>名前</th><th>価格</th><th>説明</th><th>有効</th><th>操作</th></tr></thead>
              <tbody id="options-list-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
