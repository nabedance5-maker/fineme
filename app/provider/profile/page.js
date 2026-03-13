'use client';
import { useEffect, useRef } from 'react';

export default function ProviderProfilePage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .chip{ display:inline-block; background:#f6f7f8; color:var(--muted); padding:6px 10px; border-radius:16px; font-size:13px; border:1px solid rgba(0,0,0,0.04); white-space:nowrap; }
      @media(max-width:480px){ .chip{ font-size:12px; padding:5px 8px } }
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

    // --- Ported from scripts/provider-profile.js ---
    const safeUrl = (typeof globalThis !== 'undefined' && typeof globalThis.safeUrl === 'function') ? globalThis.safeUrl : null;
    const PROVIDERS_KEY = 'glowup:providers';
    const SESSION_KEY = 'glowup:providerSession';

    function $(s, root = document) { return root.querySelector(s); }
    function loadProviders() { try { const raw = localStorage.getItem(PROVIDERS_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
    function saveProviders(list) { localStorage.setItem(PROVIDERS_KEY, JSON.stringify(list)); }
    function getSession() { try { const raw = sessionStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }

    function loadToForm() {
      const session = getSession();
      if (!session) return;
      const list = loadProviders();
      const p = list.find(x => x.id === session.id);
      if (!p) return;
      $('#profile-name').value = p.name || '';
      // Backward compatibility: if profile is empty but stores exist, migrate first store to profile
      if ((!p.profile || !p.profile.storeName) && Array.isArray(p.stores) && p.stores.length) {
        const s = p.stores[0];
        p.profile = p.profile || {};
        p.profile.storeName = p.profile.storeName || s.storeName || '';
        p.profile.address = p.profile.address || s.address || '';
        p.profile.businessHours = p.profile.businessHours || s.businessHours || '';
        p.profile.phone = p.profile.phone || s.phone || '';
        p.profile.website = p.profile.website || s.website || '';
        saveProviders(list);
      }
      $('#profile-storeName').value = p.profile?.storeName || '';
      $('#profile-phone').value = p.profile?.phone || '';
      $('#profile-address').value = p.profile?.address || '';
      if ($('#profile-postal')) $('#profile-postal').value = p.profile?.postal || '';
      if ($('#profile-priceFrom')) $('#profile-priceFrom').value = p.profile?.priceFrom || '';
      if ($('#profile-access-station')) $('#profile-access-station').value = p.profile?.access?.station || p.profile?.accessStation || '';
      if ($('#profile-access-exit')) $('#profile-access-exit').value = p.profile?.access?.exit || '';
      if ($('#profile-access-walk')) $('#profile-access-walk').value = p.profile?.access?.walk || '';
      // load payment methods
      if (Array.isArray(p.profile?.paymentMethods) && p.profile.paymentMethods.length) {
        const pmHost = document.getElementById('profile-payment-methods');
        if (pmHost) { Array.from(pmHost.querySelectorAll('input[type=checkbox]')).forEach(el => { if (el instanceof HTMLInputElement) { el.checked = p.profile.paymentMethods.includes(el.value); } }); }
      }
      // amenities: checkbox group
      if (Array.isArray(p.profile?.amenities) && p.profile.amenities.length) {
        const host = document.getElementById('profile-amenities');
        if (host) { Array.from(host.querySelectorAll('input[type=checkbox]')).forEach(el => { if (el instanceof HTMLInputElement) { el.checked = p.profile.amenities.includes(el.value); } }); }
      }
      if ($('#profile-businessHours')) $('#profile-businessHours').value = p.profile?.businessHours || '';
      // load structured business hours if present
      try {
        const bh = p.profile?.businessHoursStructured || null;
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        if (bh) {
          days.forEach(d => {
            const obj = bh[d] || {};
            const openEl = document.getElementById(`bh-${d}-open`);
            const closeEl = document.getElementById(`bh-${d}-close`);
            const closedEl = document.getElementById(`bh-${d}-closed`);
            if (openEl && openEl instanceof HTMLInputElement) openEl.value = obj.open || '';
            if (closeEl && closeEl instanceof HTMLInputElement) closeEl.value = obj.close || '';
            if (closedEl && closedEl instanceof HTMLInputElement) closedEl.checked = !!obj.closed;
          });
        }
      } catch (e) { /* ignore */ }
      $('#profile-website').value = p.profile?.website || '';
      $('#profile-description').value = p.profile?.description || '';
      // Axes & tags
      try {
        const scores = (p.onboarding && p.onboarding.scores) ? p.onboarding.scores : {};
        const cEl = document.getElementById('profile-change-range');
        const dEl = document.getElementById('profile-pace');
        if (cEl && cEl instanceof HTMLSelectElement) { const C = Number(scores?.C || 0); cEl.value = (C >= 1 && C <= 4) ? String(C) : '3'; }
        if (dEl && dEl instanceof HTMLSelectElement) { const D = Number(scores?.D || 0); dEl.value = (D >= 1 && D <= 3) ? String(D) : '2'; }
        const tierEl = document.getElementById('profile-priceTier'); if (tierEl && tierEl instanceof HTMLSelectElement) { tierEl.value = p.profile?.priceTier || 'mid'; }
        const expHost = document.getElementById('profile-expertise'); if (expHost) { const arr = Array.isArray(p.profile?.expertise) ? p.profile.expertise : []; Array.from(expHost.querySelectorAll('input[type=checkbox]')).forEach(el => { if (el instanceof HTMLInputElement) { el.checked = arr.includes(el.value); } }); }
      } catch (e) { }
      // load new optional fields
      if ($('#profile-coverSrcset')) $('#profile-coverSrcset').value = p.profile?.coverSrcset || '';
      if ($('#profile-gallery')) $('#profile-gallery').value = Array.isArray(p.profile?.gallery) ? p.profile.gallery.join('\n') : '';
      // upload strategy
      if ($('#profile-uploadStrategy')) $('#profile-uploadStrategy').value = p.profile?.uploadStrategy || 'server';
      // render previews for cover and gallery
      try {
        const coverPreview = document.getElementById('profile-coverPreview');
        if (coverPreview && coverPreview instanceof HTMLImageElement) {
          const cs = p.profile?.coverSrcset || '';
          const firstUrl = (cs && cs.split(',').length) ? cs.split(',')[0].trim().split(' ')[0] : null;
          if (firstUrl) { try { const s = (typeof safeUrl === 'function') ? (safeUrl(firstUrl) || '') : (firstUrl || ''); if (s) { coverPreview.src = s; coverPreview.style.display = 'block'; } else { coverPreview.style.display = 'none'; } } catch (e) { coverPreview.src = firstUrl; coverPreview.style.display = 'block'; } } else { coverPreview.style.display = 'none'; }
        }
        const items = Array.isArray(p.profile?.gallery) ? p.profile.gallery : [];
        try { renderGalleryPreviewItems(items); } catch (e) { }
      } catch (e) { /* ignore preview errors */ }
    }

    function onSubmit(e) {
      e.preventDefault();
      const session = getSession();
      if (!session) return;
      const list = loadProviders();
      const idx = list.findIndex(x => x.id === session.id);
      if (idx === -1) return;
      const fd = new FormData(e.currentTarget);
      list[idx].name = (fd.get('name') || '').toString().trim() || list[idx].name;
      list[idx].profile = {
        ...(list[idx].profile || {}),
        storeName: (fd.get('storeName') || '').toString().trim(),
        phone: (fd.get('phone') || '').toString().trim(),
        address: (fd.get('address') || '').toString().trim(),
        postal: (fd.get('postal') || '').toString().trim(),
        priceFrom: (fd.get('priceFrom') || '').toString().trim(),
        access: {
          station: (fd.get('accessStation') || '').toString().trim(),
          exit: (fd.get('accessExit') || '').toString().trim(),
          walk: (fd.get('accessWalk') || '').toString().trim()
        },
        businessHours: (function () {
          try {
            const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
            const names = ['月', '火', '水', '木', '金', '土', '日'];
            const parts = [];
            const structured = {};
            days.forEach((d, i) => {
              const openEl = document.getElementById(`bh-${d}-open`);
              const closeEl = document.getElementById(`bh-${d}-close`);
              const closedEl = document.getElementById(`bh-${d}-closed`);
              const open = (openEl && openEl instanceof HTMLInputElement) ? openEl.value : '';
              const close = (closeEl && closeEl instanceof HTMLInputElement) ? closeEl.value : '';
              const closed = (closedEl && closedEl instanceof HTMLInputElement) ? closedEl.checked : false;
              structured[d] = { open: open || '', close: close || '', closed: !!closed };
              if (closed) { parts.push(`${names[i]}:定休日`); } else if (open && close) { parts.push(`${names[i]}:${open}〜${close}`); } else if (open && !close) { parts.push(`${names[i]}:${open}`); }
            });
            const summary = parts.join(' / ');
            try { list[idx].profile = list[idx].profile || {}; list[idx].profile.businessHoursStructured = structured; } catch (e) { }
            return summary;
          } catch (e) { return (fd.get('businessHours') || '').toString().trim(); }
        })(),
        website: (fd.get('website') || '').toString().trim(),
        description: (fd.get('description') || '').toString(),
        uploadStrategy: (fd.get('uploadStrategy') || 'server').toString(),
        coverSrcset: (fd.get('coverSrcset') || '').toString().trim(),
        gallery: (function () { try { const raw = (fd.get('gallery') || '').toString().split(/\r?\n/).map(s => s.trim()).filter(Boolean); return raw; } catch (e) { return []; } })(),
        amenities: (function () { const host = document.getElementById('profile-amenities'); if (!host) return []; return Array.from(host.querySelectorAll('input[type=checkbox]')).map(el => el instanceof HTMLInputElement ? el : null).filter(Boolean).filter(c => c.checked).map(c => c.value); })(),
        paymentMethods: (function () { const host = document.getElementById('profile-payment-methods'); if (!host) return []; return Array.from(host.querySelectorAll('input[type=checkbox]')).map(el => el instanceof HTMLInputElement ? el : null).filter(Boolean).filter(c => c.checked).map(c => c.value); })()
      };
      // Save onboarding scores (C/D) and profile priceTier/expertise
      try {
        const C = Number((fd.get('changeRange') || '').toString()) || 3;
        const D = Number((fd.get('pace') || '').toString()) || 2;
        list[idx].onboarding = { ...(list[idx].onboarding || {}), scores: { ...(list[idx].onboarding?.scores || {}), C, D } };
        list[idx].profile.priceTier = (fd.get('priceTier') || 'mid').toString();
        const expHost = document.getElementById('profile-expertise');
        list[idx].profile.expertise = (function () { if (!expHost) return []; return Array.from(expHost.querySelectorAll('input[type=checkbox]')).map(el => el instanceof HTMLInputElement ? el : null).filter(Boolean).filter(c => c.checked).map(c => c.value); })();
      } catch (e) { }
      saveProviders(list);
      const msg = $('#provider-profile-message');
      if (msg) { msg.textContent = '保存しました。'; }
    }

    function onReset() {
      loadToForm();
      const msg = $('#provider-profile-message');
      if (msg) { msg.textContent = ''; }
    }

    function initBusinessHoursToggles() {
      try {
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        days.forEach(d => {
          const chk = document.getElementById(`bh-${d}-closed`);
          const openEl = document.getElementById(`bh-${d}-open`);
          const closeEl = document.getElementById(`bh-${d}-close`);
          function apply() {
            try {
              const isClosed = chk && chk instanceof HTMLInputElement && chk.checked;
              if (openEl && openEl instanceof HTMLInputElement) { openEl.disabled = !!isClosed; openEl.style.opacity = isClosed ? '0.6' : '1'; }
              if (closeEl && closeEl instanceof HTMLInputElement) { closeEl.disabled = !!isClosed; closeEl.style.opacity = isClosed ? '0.6' : '1'; }
            } catch (e) { }
          }
          if (chk && chk instanceof HTMLInputElement) { chk.addEventListener('change', apply); }
          apply();
        });
      } catch (e) { }
    }

    async function lookupPostalCode() {
      try {
        const el = document.getElementById('profile-postal');
        const msg = document.getElementById('postal-lookup-msg');
        if (msg) msg.textContent = '';
        if (!el || !(el instanceof HTMLInputElement)) return;
        const raw = el.value || '';
        const code = raw.replace(/[^0-9]/g, '');
        if (!/^[0-9]{7}$/.test(code)) {
          if (msg) msg.textContent = '郵便番号は7桁で入力してください（例:1500001）';
          return;
        }
        if (msg) msg.textContent = '検索中…';
        const url = `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${code}`;
        const res = await fetch(url);
        const j = await res.json();
        if (j && j.results && j.results.length) {
          const r = j.results[0];
          const addr = `${r.address1 || ''}${r.address2 || ''}${r.address3 || ''}`;
          const addrEl = document.getElementById('profile-address');
          if (addrEl && addrEl instanceof HTMLInputElement) {
            if (!addrEl.value || addrEl.value.trim() === '') addrEl.value = addr;
          }
          if (msg) msg.textContent = '住所を補完しました。必要に応じて番地以降を入力してください。';
        } else {
          if (msg) msg.textContent = j.message || '住所が見つかりませんでした。';
        }
      } catch (e) { const msg = document.getElementById('postal-lookup-msg'); if (msg) msg.textContent = '検索に失敗しました'; }
    }

    async function searchStations(query) {
      const trimmed = (query || '').toString().trim();
      if (!trimmed) return [];
      try {
        if (typeof window !== 'undefined' && window.STATION_API_ENDPOINT) {
          try {
            const endpoint = window.STATION_API_ENDPOINT;
            const url = `${String(endpoint).replace(/\/?$/, '')}` + `?q=${encodeURIComponent(trimmed)}`;
            const res = await fetch(url);
            if (res.ok) { const j = await res.json(); return Array.isArray(j) ? j : []; }
          } catch (e) { /* fall through to sample fallback */ }
        }
      } catch (e) { /* ignore and fallback */ }
      const SAMPLE = [
        { name: '表参道駅', line: '東京メトロ千代田線／半蔵門線／銀座線', exit: 'B2' },
        { name: '原宿駅', line: 'JR山手線', exit: '表参道口' },
        { name: '渋谷駅', line: 'JR/東急/東京メトロ', exit: 'ハチ公口' },
        { name: '新宿駅', line: 'JR/小田急/京王/東京メトロ', exit: '西口' }
      ];
      const q = trimmed.replace(/駅$/, '');
      return SAMPLE.filter(s => s.name.indexOf(q) !== -1 || (s.line && s.line.indexOf(q) !== -1));
    }

    function renderStationResults(list) {
      const host = document.getElementById('station-search-results');
      if (!host) return;
      host.textContent = '';
      if (!Array.isArray(list) || list.length === 0) { const d = document.createElement('div'); d.className = 'muted'; d.textContent = '候補が見つかりませんでした'; host.appendChild(d); return; }
      const ul = document.createElement('div'); ul.style.display = 'flex'; ul.style.flexDirection = 'column'; ul.style.gap = '6px';
      list.forEach(it => {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn btn-ghost'; btn.style.textAlign = 'left';
        const label = `${it.name}${it.exit ? ' / 出口:' + it.exit : ''}${it.line ? ' / ' + it.line : ''}`;
        btn.textContent = label;
        btn.addEventListener('click', () => {
          const stEl = document.getElementById('profile-access-station');
          const exitEl = document.getElementById('profile-access-exit');
          if (stEl && stEl instanceof HTMLInputElement) stEl.value = it.name;
          if (exitEl && exitEl instanceof HTMLInputElement && it.exit) exitEl.value = it.exit;
          host.textContent = '';
        });
        ul.appendChild(btn);
      });
      host.appendChild(ul);
    }

    function uploadFiles(files, opts, onProgress) {
      return new Promise(async (resolve, reject) => {
        const serverBase = (typeof window !== 'undefined' && window.UPLOAD_SERVER_URL) ? window.UPLOAD_SERVER_URL : 'http://localhost:4000';
        const sizes = (opts && opts.isVideo) ? [] : [320, 640, 1200];

        function resizeImageToBlob(file, width, mimeType) {
          return new Promise((resolveResize, rejectResize) => {
            try {
              const url = URL.createObjectURL(file);
              const img = new Image();
              img.onload = function () {
                try {
                  const ratio = img.naturalHeight / img.naturalWidth || 1;
                  const w = Math.min(width, img.naturalWidth);
                  const h = Math.round(w * ratio);
                  const canvas = document.createElement('canvas');
                  canvas.width = w; canvas.height = h;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, w, h);
                  canvas.toBlob(function (blob) {
                    URL.revokeObjectURL(url);
                    if (blob) resolveResize(blob); else rejectResize(new Error('toBlob failed'));
                  }, mimeType || 'image/jpeg', 0.85);
                } catch (err) { URL.revokeObjectURL(url); rejectResize(err); }
              };
              img.onerror = function (err) { URL.revokeObjectURL(url); rejectResize(err || new Error('image load error')); };
              try {
                if (typeof url === 'string' && (url.startsWith('blob:') || url.startsWith('data:'))) {
                  img.src = url;
                } else {
                  const s = (typeof safeUrl === 'function') ? safeUrl(url) : url;
                  if (s) img.src = s;
                }
              } catch (e) { img.src = url; }
            } catch (e) { rejectResize(e); }
          });
        }

        function putBlobWithXhr(url, blob, contentType, onPutProgress) {
          return new Promise((resPut, rejPut) => {
            try {
              const xhr = new XMLHttpRequest();
              xhr.open('PUT', url, true);
              if (contentType) try { xhr.setRequestHeader('Content-Type', contentType); } catch (e) { }
              xhr.upload.onprogress = function (e) { if (e.lengthComputable && typeof onPutProgress === 'function') { const pct = (e.loaded / e.total) * 100; try { onPutProgress(pct); } catch (_) { } } };
              xhr.onload = function () { if (xhr.status >= 200 && xhr.status < 300) { resPut(xhr.response); } else { rejPut(new Error('PUT failed ' + xhr.status)); } };
              xhr.onerror = function (err) { rejPut(err || new Error('PUT xhr error')); };
              xhr.send(blob);
            } catch (e) { rejPut(e); }
          });
        }

        const strategyEl = document.getElementById('profile-uploadStrategy');
        const strategy = (strategyEl && strategyEl instanceof HTMLSelectElement) ? strategyEl.value : (typeof window !== 'undefined' && window.UPLOAD_PREFERRED_STRATEGY) ? window.UPLOAD_PREFERRED_STRATEGY : 'server';

        let presignSupported = false;
        if (strategy === 'direct') {
          try {
            const presignUrl = serverBase.replace(/\/$/, '') + '/presign';
            const results = { results: [], coverSrcset: null, galleryUrls: [] };
            let totalUploads = 0; let completedUploads = 0;
            const presignList = [];
            for (const f of files) {
              try {
                const body = { filename: f.name, sizes };
                const headers = { 'Content-Type': 'application/json' };
                try { if (typeof window !== 'undefined' && window.UPLOAD_API_KEY) headers['x-api-key'] = window.UPLOAD_API_KEY; } catch (e) { }
                const resp = await fetch(presignUrl, { method: 'POST', headers, body: JSON.stringify(body) });
                if (!resp.ok) { throw new Error('presign failed ' + resp.status); }
                const j = await resp.json();
                if (!j || !j.ok) throw new Error('presign response not ok');
                presignList.push({ file: f, presignData: j });
                totalUploads += (Array.isArray(j.presigns) ? j.presigns.length : 0) + (j.orig ? 1 : 0);
              } catch (e) { console.warn('presign request failed for', f.name, e); throw e; }
            }
            presignSupported = presignList.length === files.length;
            if (presignSupported) {
              for (const entry of presignList) {
                const f = entry.file; const pd = entry.presignData;
                for (const p of (pd.presigns || [])) {
                  try {
                    const blob = await resizeImageToBlob(f, Number(p.size), f.type || 'image/jpeg');
                    await putBlobWithXhr(p.presignedUrl, blob, blob.type || f.type || 'application/octet-stream', function (pct) {
                      const approx = ((completedUploads + pct / 100) / (totalUploads || 1)) * 100;
                      try { if (typeof onProgress === 'function') onProgress(approx); } catch (_) { }
                    });
                    completedUploads++;
                  } catch (e) { console.error('upload to presigned size failed', e); throw e; }
                }
                if (pd.orig && pd.orig.presignedUrl) {
                  try {
                    await putBlobWithXhr(pd.orig.presignedUrl, f, f.type || 'application/octet-stream', function (pct) { const approx = ((completedUploads + pct / 100) / (totalUploads || 1)) * 100; try { if (typeof onProgress === 'function') onProgress(approx); } catch (_) { } });
                    completedUploads++;
                  } catch (e) { console.error('upload original presigned failed', e); throw e; }
                }
                const srcset = (pd.presigns || []).map(pp => `${pp.publicUrl} ${pp.size}w`).join(', ');
                const galleryUrl = (pd.presigns && pd.presigns.length) ? pd.presigns[pd.presigns.length - 1].publicUrl : (pd.orig ? pd.orig.publicUrl : null);
                results.results.push({ originalName: f.name, urls: (pd.presigns || []).reduce((acc, pp) => { acc[pp.size] = pp.publicUrl; return acc; }, {}), generated: (pd.presigns || []).map(pp => ({ size: pp.size, url: pp.publicUrl })), originalUrl: (pd.orig && pd.orig.publicUrl) || null, srcset });
              }
              results.coverSrcset = results.results.length === 1 ? results.results[0].srcset : null;
              results.galleryUrls = results.results.map(r => r.generated && r.generated.length ? r.generated[r.generated.length - 1].url : r.originalUrl).filter(Boolean);
              return resolve(results);
            }
          } catch (e) { console.warn('presign flow failed, falling back to server upload', e); }
        }

        // fallback: multipart POST to /upload
        try {
          const url = serverBase + '/upload';
          const qs = (Array.isArray(sizes) && sizes.length) ? ('?sizes=' + sizes.join(',')) : '';
          const fd = new FormData();
          for (const f of files) { fd.append('files', f, f.name); }
          const xhr = new XMLHttpRequest();
          xhr.open('POST', url + qs, true);
          try { if (typeof window !== 'undefined' && window.UPLOAD_API_KEY) { xhr.setRequestHeader('x-api-key', window.UPLOAD_API_KEY); } } catch (e) { }
          xhr.responseType = 'json';
          xhr.upload.onprogress = function (e) { if (e.lengthComputable && typeof onProgress === 'function') { const pct = (e.loaded / e.total) * 100; try { onProgress(pct); } catch (_) { } } };
          xhr.onload = function () { if (xhr.status >= 200 && xhr.status < 300) { resolve(xhr.response); } else { console.error('upload failed', xhr.status, xhr.responseText); reject(new Error('upload failed')); } };
          xhr.onerror = function (err) { console.error('upload XHR error', err); reject(err); };
          xhr.send(fd);
        } catch (e) { console.error('uploadFiles error', e); const msg = document.getElementById('provider-profile-message'); if (msg) msg.textContent = '画像のアップロードに失敗しました'; reject(e); }
      });
    }

    function renderGalleryPreviewItems(items) {
      const container = document.getElementById('profile-gallery-preview');
      if (!container) return;
      container.textContent = '';
      items.forEach((u, idx) => {
        try {
          const item = document.createElement('div');
          item.className = 'gallery-thumb';
          item.draggable = true;
          item.style.display = 'flex';
          item.style.flexDirection = 'column';
          item.style.alignItems = 'center';
          item.style.gap = '6px';
          const img = document.createElement('img');
          try {
            if (typeof u === 'string' && (u.startsWith('blob:') || u.startsWith('data:'))) { img.src = u; }
            else { const s = (typeof safeUrl === 'function') ? safeUrl(u) : u; if (s) img.src = s; }
          } catch (e) { img.src = u; }
          img.style.width = '96px'; img.style.height = '64px'; img.style.objectFit = 'cover'; img.style.borderRadius = '6px'; img.style.border = '1px solid var(--color-border)';
          const btns = document.createElement('div'); btns.style.display = 'flex'; btns.style.gap = '6px';
          const del = document.createElement('button'); del.type = 'button'; del.className = 'btn btn-ghost'; del.textContent = '削除'; del.style.fontSize = '12px';
          del.addEventListener('click', () => { const list = currentGalleryList(); const filtered = list.filter(x => x !== u); renderGalleryPreviewItems(filtered); updateGalleryTextareaAndSave(filtered); });
          btns.appendChild(del);
          item.appendChild(img); item.appendChild(btns);
          item.addEventListener('dragstart', (ev) => { ev.dataTransfer && ev.dataTransfer.setData('text/plain', u); item.classList.add('dragging'); });
          item.addEventListener('dragend', () => { item.classList.remove('dragging'); });
          item.addEventListener('dragover', (ev) => { ev.preventDefault(); });
          item.addEventListener('drop', (ev) => {
            ev.preventDefault();
            try {
              const srcUrl = ev.dataTransfer && ev.dataTransfer.getData('text/plain');
              if (!srcUrl) return;
              const list = currentGalleryList();
              const srcIdx = list.indexOf(srcUrl);
              const dstIdx = idx;
              if (srcIdx === -1) return;
              list.splice(srcIdx, 1); list.splice(dstIdx, 0, srcUrl);
              renderGalleryPreviewItems(list); updateGalleryTextareaAndSave(list);
            } catch (e) { }
          });
          container.appendChild(item);
        } catch (e) { }
      });
    }

    function currentGalleryList() { const t = document.getElementById('profile-gallery'); if (!t || !(t instanceof HTMLTextAreaElement)) return []; return t.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean); }

    function updateGalleryTextareaAndSave(list) {
      const t = document.getElementById('profile-gallery'); if (t && t instanceof HTMLTextAreaElement) { t.value = list.join('\n'); }
      try { const f = document.getElementById('provider-profile-form'); if (f && typeof f.requestSubmit === 'function') { f.requestSubmit(); } else if (f) { f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } } catch (e) { console.error('auto-save failed', e); }
    }

    // --- Init ---
    const form = document.getElementById('provider-profile-form');
    if (form) { form.addEventListener('submit', onSubmit); }
    const reset = document.getElementById('provider-profile-reset');
    if (reset) { reset.addEventListener('click', onReset); }
    loadToForm();
    initBusinessHoursToggles();

    // postal lookup wiring
    try {
      const postalBtn = document.getElementById('postal-lookup-btn');
      if (postalBtn) { postalBtn.addEventListener('click', () => { lookupPostalCode(); }); }
      const stationBtn = document.getElementById('station-search-btn');
      if (stationBtn) {
        stationBtn.addEventListener('click', async () => {
          const stInputEl = document.getElementById('profile-access-station');
          const q = (stInputEl && stInputEl instanceof HTMLInputElement) ? stInputEl.value : '';
          const list = await searchStations(q);
          renderStationResults(list);
        });
      }
      const stInput = document.getElementById('profile-access-station');
      if (stInput && stInput instanceof HTMLInputElement) {
        stInput.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            const stationBtnEl = document.getElementById('station-search-btn');
            stationBtnEl && stationBtnEl.click();
          }
        });
      }
    } catch (e) { /* ignore */ }

    // File upload handlers
    try {
      const coverInput = document.getElementById('profile-coverUpload');
      if (coverInput && coverInput instanceof HTMLInputElement) {
        coverInput.addEventListener('change', async () => {
          const files = Array.from(coverInput.files || []);
          if (files.length === 0) return;
          const statusEl = document.getElementById('profile-coverUploadStatus');
          const progressEl = document.getElementById('profile-coverProgress');
          if (progressEl && progressEl instanceof HTMLProgressElement) { progressEl.style.display = 'block'; progressEl.value = 0; }
          if (statusEl) statusEl.textContent = 'アップロード中...';
          const res = await uploadFiles(files, { asCover: true }, (pct) => { try { if (progressEl && progressEl instanceof HTMLProgressElement) { progressEl.value = pct; } if (statusEl) statusEl.textContent = `アップロード中 ${Math.round(pct)}%`; } catch (e) { } });
          if (progressEl && progressEl instanceof HTMLProgressElement) { progressEl.style.display = 'none'; progressEl.value = 0; }
          if (statusEl) statusEl.textContent = '';
          if (res && res.coverSrcset) {
            const cs = document.getElementById('profile-coverSrcset'); if (cs && cs instanceof HTMLInputElement) cs.value = res.coverSrcset;
            const firstUrl = res.coverSrcset.split(',')[0].trim().split(' ')[0];
            const coverPreview = document.getElementById('profile-coverPreview'); if (coverPreview && coverPreview instanceof HTMLImageElement) { try { const s = (typeof safeUrl === 'function') ? (safeUrl(firstUrl) || '') : (firstUrl || ''); if (s) { coverPreview.src = s; coverPreview.style.display = 'block'; } else { coverPreview.style.display = 'none'; } } catch (e) { coverPreview.src = firstUrl; coverPreview.style.display = 'block'; } }
            const msg = document.getElementById('provider-profile-message'); if (msg) msg.textContent = 'カバー画像をアップロードしました（srcset を自動設定）。';
            try { const f = document.getElementById('provider-profile-form'); if (f && typeof f.requestSubmit === 'function') { f.requestSubmit(); } else if (f) { f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } } catch (e) { console.error('auto-save failed', e); }
          }
        });
      }
      const galleryInput = document.getElementById('profile-galleryUpload');
      if (galleryInput && galleryInput instanceof HTMLInputElement) {
        galleryInput.addEventListener('change', async () => {
          const files = Array.from(galleryInput.files || []);
          if (files.length === 0) return;
          const statusEl = document.getElementById('profile-galleryUploadStatus');
          const progressEl = document.getElementById('profile-galleryProgress');
          if (progressEl && progressEl instanceof HTMLProgressElement) { progressEl.style.display = 'block'; progressEl.value = 0; }
          const res = await uploadFiles(files, { asCover: false }, (pct) => { try { if (progressEl && progressEl instanceof HTMLProgressElement) { progressEl.value = pct; } if (statusEl) statusEl.textContent = `アップロード中 ${Math.round(pct)}%`; } catch (e) { } });
          if (progressEl && progressEl instanceof HTMLProgressElement) { progressEl.style.display = 'none'; progressEl.value = 0; }
          if (statusEl) statusEl.textContent = '';
          if (res && Array.isArray(res.galleryUrls) && res.galleryUrls.length) {
            const g = document.getElementById('profile-gallery');
            if (g && g instanceof HTMLTextAreaElement) {
              const existing = g.value ? g.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [];
              const merged = existing.concat(res.galleryUrls).filter(Boolean);
              g.value = merged.join('\n');
              const msg = document.getElementById('provider-profile-message'); if (msg) msg.textContent = 'ギャラリー画像をアップロードしました。';
              try { renderGalleryPreviewItems(merged); } catch (e) { }
              try { const f = document.getElementById('provider-profile-form'); if (f && typeof f.requestSubmit === 'function') { f.requestSubmit(); } else if (f) { f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } } catch (e) { console.error('auto-save failed', e); }
            }
          }
        });
      }
      // Cover video upload
      const coverVideoInput = document.getElementById('profile-coverVideoUpload');
      if (coverVideoInput && coverVideoInput instanceof HTMLInputElement) {
        coverVideoInput.addEventListener('change', async () => {
          const files = Array.from(coverVideoInput.files || []);
          if (files.length === 0) return;
          const file = files[0];
          const statusEl = document.getElementById('profile-coverVideoUploadStatus');
          const progressEl = document.getElementById('profile-coverVideoProgress');
          const preview = document.getElementById('profile-coverVideoPreview');
          if (progressEl && progressEl instanceof HTMLProgressElement) { progressEl.style.display = 'block'; progressEl.value = 0; }
          if (statusEl) statusEl.textContent = 'アップロード準備中...';
          try {
            const res = await uploadFiles([file], { asCover: true, isVideo: true }, (pct) => { try { if (progressEl && progressEl instanceof HTMLProgressElement) progressEl.value = pct; if (statusEl) statusEl.textContent = `アップロード中 ${Math.round(pct)}%`; } catch (e) { } });
            if (progressEl && progressEl instanceof HTMLProgressElement) { progressEl.style.display = 'none'; progressEl.value = 0; }
            if (statusEl) statusEl.textContent = '';
            let videoUrl = null;
            if (res) {
              if (Array.isArray(res.galleryUrls) && res.galleryUrls.length) videoUrl = res.galleryUrls[0];
              else if (Array.isArray(res.results) && res.results.length && res.results[0].originalUrl) videoUrl = res.results[0].originalUrl;
              else if (res.orig && res.orig.publicUrl) videoUrl = res.orig.publicUrl;
            }
            if (videoUrl) {
              const vidField = document.getElementById('profile-coverVideo');
              if (vidField && (vidField instanceof HTMLInputElement || vidField instanceof HTMLTextAreaElement)) { vidField.value = videoUrl; }
              if (preview && preview instanceof HTMLVideoElement) { try { const s = (typeof safeUrl === 'function') ? (safeUrl(videoUrl) || '') : (videoUrl || ''); if (s) { preview.src = s; preview.style.display = 'block'; try { preview.play().catch(() => { }); } catch (e) { } } else { preview.src = ''; preview.style.display = 'none'; } } catch (e) { preview.src = videoUrl; preview.style.display = 'block'; try { preview.play().catch(() => { }); } catch (e) { } } }
              const msg = document.getElementById('provider-profile-message'); if (msg) msg.textContent = 'カバー動画をアップロードしました。';
              try { const f = document.getElementById('provider-profile-form'); if (f && typeof f.requestSubmit === 'function') { f.requestSubmit(); } else if (f) { f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); } } catch (e) { console.error('auto-save failed', e); }
            }
          } catch (e) { console.error('cover video upload failed', e); if (statusEl) statusEl.textContent = 'アップロードに失敗しました'; }
        });
      }
    } catch (e) { console.error('upload wiring failed', e); }

    return () => { try { document.head.removeChild(style); } catch { } };
  }, []);

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: '840px' }}>
        <h1 className="section-title">店舗プロフィール</h1>
        <p className="muted">店舗の基本情報を編集します。管理画面と同じ情報が保存され、検索や詳細に反映可能です。</p>
        <div className="card" style={{ padding: '24px' }}>
          <form id="provider-profile-form">
            <div className="stack">
              <label>掲載名（一覧に表示される名称）
                <input id="profile-name" name="name" type="text" placeholder="例）メンズサロン TOKYO" />
              </label>
              <div>
                <label>店舗名
                  <input id="profile-storeName" name="storeName" type="text" placeholder="例）Fineme 表参道店" />
                </label>
                <label>電話番号
                  <input id="profile-phone" name="phone" type="text" placeholder="例）03-1234-5678" />
                </label>
                <label>住所
                  <input id="profile-address" name="address" type="text" placeholder="例）東京都渋谷区神宮前1-1-1" />
                </label>
                <label>郵便番号
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input id="profile-postal" name="postal" type="text" placeholder="例）150-0001" />
                    <button id="postal-lookup-btn" type="button" className="btn btn-ghost">住所を自動補完</button>
                    <span id="postal-lookup-msg" className="muted" style={{ fontSize: '13px' }}></span>
                  </div>
                </label>
                <label>営業時間 (曜日別)</label>
                <div id="business-hours-structured" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { id: 'mon', label: '月 (Mon)' },
                    { id: 'tue', label: '火 (Tue)' },
                    { id: 'wed', label: '水 (Wed)' },
                    { id: 'thu', label: '木 (Thu)' },
                    { id: 'fri', label: '金 (Fri)' },
                    { id: 'sat', label: '土 (Sat)' },
                    { id: 'sun', label: '日 (Sun)' },
                  ].map(({ id, label }) => (
                    <div key={id} style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ width: '80px' }}>{label}</div>
                      <input type="time" id={`bh-${id}-open`} name={`bh_${id}_open`} style={{ width: '110px', height: '34px', padding: '4px', boxSizing: 'border-box', verticalAlign: 'middle' }} />
                      <span>〜</span>
                      <input type="time" id={`bh-${id}-close`} name={`bh_${id}_close`} style={{ width: '110px', height: '34px', padding: '4px', boxSizing: 'border-box', verticalAlign: 'middle' }} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input type="checkbox" id={`bh-${id}-closed`} name={`bh_${id}_closed`} className="bh-closed-checkbox" aria-label={`${label.split(' ')[0]}曜日は定休日`} />
                        <span style={{ lineHeight: '1', whiteSpace: 'nowrap', writingMode: 'horizontal-tb' }}>定休日</span>
                      </label>
                    </div>
                  ))}
                  <p className="muted">保存すると「営業時間」欄に要約文字列が生成されます（既存の単一行入力とは互換性あり）。</p>
                </div>
                <label>価格目安（最安値）
                  <input id="profile-priceFrom" name="priceFrom" type="number" min="0" step="1" placeholder="例）3800" />
                </label>
                <div style={{ display: 'block' }}>
                  <label style={{ display: 'block' }}>最寄り駅
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input id="profile-access-station" name="accessStation" type="text" placeholder="駅名を入力して候補を検索（例: 表参道）" />
                      <button id="station-search-btn" type="button" className="btn btn-ghost">駅を検索</button>
                    </div>
                    <div id="station-search-results" style={{ marginTop: '6px' }}></div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>出口
                        <input id="profile-access-exit" name="accessExit" type="text" placeholder="例）B2" style={{ width: '120px' }} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>徒歩分
                        <input id="profile-access-walk" name="accessWalk" type="number" min="0" step="1" placeholder="例）5" style={{ width: '80px' }} />
                      </label>
                    </div>
                  </label>
                </div>
                <div>
                  <label>設備・サービス（複数選択可）</label>
                  <div id="profile-amenities" className="cluster" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="parking" /> <span className="chip">駐車場</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="private_room" /> <span className="chip">個室</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="wheelchair" /> <span className="chip">バリアフリー</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="wifi" /> <span className="chip">Wi‑Fi</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="credit_card" /> <span className="chip">クレジットカード可</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="child_friendly" /> <span className="chip">子連れ可</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="women_only" /> <span className="chip">女性専用</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="priority_reservation" /> <span className="chip">予約優先</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="same_day" /> <span className="chip">当日予約可</span></label>
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <label>支払方法（複数選択可）</label>
                  <div id="profile-payment-methods" className="cluster" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="cash" /> <span className="chip">現金</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="credit_card" /> <span className="chip">クレジットカード</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="paypay" /> <span className="chip">PayPay</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="linepay" /> <span className="chip">LINE Pay</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="applepay" /> <span className="chip">Apple Pay</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="googlepay" /> <span className="chip">Google Pay</span></label>
                  </div>
                </div>
                <label>Webサイト
                  <input id="profile-website" name="website" type="text" placeholder="https://example.com" />
                </label>
                <label>カバー画像 srcset（任意・コンマ区切り）
                  <input id="profile-coverSrcset" name="coverSrcset" type="text" placeholder="例: /assets/cover-320.jpg 320w, /assets/cover-640.jpg 640w" style={{ display: 'block', width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '8px' }} />
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px' }}>アップロード方式：</span>
                      <select id="profile-uploadStrategy" name="uploadStrategy">
                        <option value="server">サーバで処理（デフォルト・推奨）</option>
                        <option value="direct">クライアント→S3 (presign)（帯域優先）</option>
                      </select>
                    </label>
                    <span className="muted" style={{ fontSize: '12px' }}>大量アップロードやモバイルでは「サーバで処理」を推奨します。presign はクライアント帯域を優先するオプションです。</span>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input id="profile-coverUpload" name="coverUpload" type="file" accept="image/*" />
                    <input id="profile-coverVideoUpload" name="coverVideoUpload" type="file" accept="video/*" />
                    <span className="muted" style={{ fontSize: '12px' }}>画像をアップロードすると自動で複数サイズが生成され、srcset が自動挿入されます（ローカルサーバが必要）。</span>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <label>カバー動画 URL（自動入力されます）
                      <input id="profile-coverVideo" name="coverVideo" type="text" placeholder="動画 URL が入ります" style={{ display: 'block', width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '8px' }} />
                    </label>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <img id="profile-coverPreview" alt="cover preview" style={{ width: '180px', height: '120px', objectFit: 'cover', border: '1px solid var(--color-border)', borderRadius: '6px', display: 'none' }} />
                    <video id="profile-coverVideoPreview" style={{ width: '240px', height: '140px', objectFit: 'cover', border: '1px solid var(--color-border)', borderRadius: '6px', display: 'none' }} controls muted loop playsInline></video>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <progress id="profile-coverProgress" max="100" value="0" style={{ display: 'none', width: '180px' }}></progress>
                      <div id="profile-coverUploadStatus" className="muted" style={{ fontSize: '13px' }}></div>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <progress id="profile-coverVideoProgress" max="100" value="0" style={{ display: 'none', width: '240px' }}></progress>
                    <div id="profile-coverVideoUploadStatus" className="muted" style={{ fontSize: '13px' }}></div>
                  </div>
                  <div className="muted" style={{ fontSize: '12px' }}>複数解像度を指定するとヒーローで srcset を使用します（LCP 向上）。</div>
                </label>
                <label>ギャラリー画像 URL（1行に1つ）
                  <textarea id="profile-gallery" name="gallery" rows="3" placeholder="各行に画像URLを入力"></textarea>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input id="profile-galleryUpload" name="galleryUpload" type="file" accept="image/*" multiple />
                    <span className="muted" style={{ fontSize: '12px' }}>複数画像を選択してアップロードできます。生成された URL はギャラリーに追加されます。</span>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <div id="profile-gallery-preview" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}></div>
                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <progress id="profile-galleryProgress" max="100" value="0" style={{ display: 'none', width: '240px' }}></progress>
                      <div id="profile-galleryUploadStatus" className="muted" style={{ fontSize: '13px' }}></div>
                    </div>
                  </div>
                  <div className="muted" style={{ fontSize: '12px' }}>プロフィールとサービスの画像を合わせてギャラリーを構成します。</div>
                </label>
              </div>
              <label>紹介文
                <textarea id="profile-description" name="description" rows="4" placeholder="店舗/掲載者の紹介文"></textarea>
              </label>
              <div className="cluster">
                <button className="btn" type="submit">保存</button>
                <button id="provider-profile-reset" className="btn btn-ghost" type="button">キャンセル</button>
                <span id="provider-profile-message" className="muted" aria-live="polite"></span>
              </div>
              <hr style={{ margin: '24px 0' }} />
              <div className="stack" style={{ gap: '12px' }}>
                <h2 className="section-title" style={{ fontSize: '18px' }}>診断連動タグ（相性表示に活用）</h2>
                <div className="cluster">
                  <label style={{ flex: '1' }}>変化幅（C軸）
                    <select id="profile-change-range" name="changeRange">
                      <option value="1">小さめ（控えめな変化）</option>
                      <option value="2">やや小さめ</option>
                      <option value="3">標準</option>
                      <option value="4">大きめ（しっかり変える）</option>
                    </select>
                  </label>
                  <label style={{ flex: '1' }}>提案スタイル / ペース（D軸）
                    <select id="profile-pace" name="pace">
                      <option value="1">保守（慎重に進める）</option>
                      <option value="2">標準（バランスよく）</option>
                      <option value="3">攻め（テンポ良く進める）</option>
                    </select>
                  </label>
                </div>
                <div className="cluster">
                  <label style={{ flex: '1' }}>価格帯
                    <select id="profile-priceTier" name="priceTier">
                      <option value="low">低め</option>
                      <option value="mid" defaultValue>中くらい</option>
                      <option value="high">高め</option>
                    </select>
                  </label>
                </div>
                <div>
                  <label>得意領域（複数選択可）</label>
                  <div id="profile-expertise" className="cluster" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="eyebrow" /> <span className="chip">眉</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="hairremoval" /> <span className="chip">脱毛</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="esthetic" /> <span className="chip">エステ</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="whitening" /> <span className="chip">ホワイトニング</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="orthodontics" /> <span className="chip">矯正</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="aga" /> <span className="chip">AGA</span></label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" value="nail" /> <span className="chip">ネイル</span></label>
                  </div>
                </div>
                <p className="muted">C/D軸はユーザー診断の相性計算に使われます。価格帯・得意領域は検索やカードの補助タグとして使用します。</p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
