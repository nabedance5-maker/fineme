'use client';
import { useEffect, useRef } from 'react';

export default function ProviderDashboardPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .tab-nav { display: flex; gap: 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 24px; overflow-x: auto; }
      .tab-btn { padding: 10px 20px; border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #6b7280; border-bottom: 2px solid transparent; margin-bottom: -2px; white-space: nowrap; transition: color .15s; }
      .tab-btn.active { color: #111; border-bottom-color: #111; }
      .tab-pane { display: none; }
      .tab-pane.active { display: block; }
      .form-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
      .form-field label { font-size: 12px; font-weight: 700; color: #374151; }
      .form-field input, .form-field textarea, .form-field select { padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 14px; width: 100%; box-sizing: border-box; }
      .form-field textarea { min-height: 100px; resize: vertical; }
      .checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; }
      .checkbox-item { display: flex; align-items: center; gap: 6px; font-size: 14px; }
      .stat-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; }
      .stat-value { font-size: 32px; font-weight: 800; color: #111; }
      .stat-label { font-size: 12px; color: #6b7280; margin-top: 2px; }
      .publish-toggle { display: flex; align-items: center; gap: 12px; padding: 16px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; }
      .toggle-switch { position: relative; width: 48px; height: 26px; flex-shrink: 0; }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .toggle-slider { position: absolute; inset: 0; background: #d1d5db; border-radius: 26px; cursor: pointer; transition: background .2s; }
      .toggle-slider:before { content:''; position: absolute; width: 18px; height: 18px; left: 4px; bottom: 4px; background: #fff; border-radius: 50%; transition: transform .2s; }
      .toggle-switch input:checked + .toggle-slider { background: #111; }
      .toggle-switch input:checked + .toggle-slider:before { transform: translateX(22px); }
      .referral-code-box { padding: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; font-family: monospace; font-size: 18px; font-weight: 800; text-align: center; letter-spacing: 2px; }
    `;
    document.head.appendChild(style);

    // ── Auth helpers (inlined from scripts/auth.js) ──────────────
    const PROVIDER_KEY = 'fineme:provider:current';
    const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZnB6bHZ1Y3F6bWpsZHNod3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODM1MzIsImV4cCI6MjA4ODU1OTUzMn0.9mBlP8-0l9jotex_UkX7Ba8ZodYtailaxoK_RIy3Kq8';

    // ── Tab switching ────────────────────────────────────────────
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      const btn = document.querySelector(`[data-tab="${tabId}"]`);
      const pane = document.getElementById('tab-' + tabId);
      if (btn) btn.classList.add('active');
      if (pane) pane.classList.add('active');
    }
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    const tabParam = new URLSearchParams(location.search).get('tab');
    if (tabParam) switchTab(tabParam);

    // ── Provider data helpers ────────────────────────────────────
    function loadProviderData() {
      try { const raw = localStorage.getItem(PROVIDER_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
    }

    function getSupabaseToken() {
      try {
        const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        if (!key) return null;
        const session = JSON.parse(localStorage.getItem(key));
        return session?.access_token || null;
      } catch { return null; }
    }

    async function fetchAndCacheProviderData() {
      const token = getSupabaseToken();
      if (!token) return null;
      try {
        const res = await fetch('/api/provider/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return null;
        const data = await res.json();
        localStorage.setItem(PROVIDER_KEY, JSON.stringify(data));
        return data;
      } catch { return null; }
    }

    const PLAN_LABELS = { A: 'ライト（¥5,000/月）', B: 'スタンダード（¥7,000/月）', C: 'プレミアム（¥10,000/月）', free: '特例（無料）' };

    let provider = loadProviderData();
    fetchAndCacheProviderData().then(data => {
      if (data && JSON.stringify(data) !== JSON.stringify(provider)) {
        location.reload();
      }
    });

    if (provider) {
      document.getElementById('provider-name-header').textContent = provider.name || '掲載者ダッシュボード';
      const fnCode = provider.referral_code || '';
      const badge = document.getElementById('provider-number-badge');
      if (badge && fnCode) { badge.textContent = fnCode; badge.style.display = 'inline'; }
      const slug = provider.slug || fnCode.toLowerCase() || '';
      if (slug) {
        document.getElementById('provider-page-link').textContent = `fineme.me/provider/${slug}`;
        document.getElementById('view-page-btn').href = `/provider/${slug}`;
      }
      document.getElementById('billing-plan').textContent = PLAN_LABELS[provider.plan || 'A'] || 'プランA';
      document.getElementById('billing-status').textContent = provider.billing_started ? 'Fineme経由の予約が発生し、課金が始まっています' : '課金はまだ始まっていません（初回予約発生後に開始）';
      document.getElementById('referral-code').textContent = fnCode || slug || '—';
      document.getElementById('publish-toggle-input').checked = !!provider.published;
      document.getElementById('publish-label').textContent = provider.published ? '公開中' : '非公開';
      ['name', 'catchphrase', 'target_desc', 'philosophy', 'photo_url'].forEach(k => {
        const el = document.getElementById('profile-form').elements[k];
        if (el) el.value = provider[k] || '';
      });
      ['description', 'area', 'price_from', 'provider_style'].forEach(k => {
        const el = document.getElementById('service-form').elements[k];
        if (el) el.value = provider[k] || '';
      });
      document.querySelectorAll('[name=suitable_triggers]').forEach(cb => { cb.checked = (provider.suitable_triggers || []).includes(cb.value); });
      document.querySelectorAll('[name=handles_failure_patterns]').forEach(cb => { cb.checked = (provider.handles_failure_patterns || []).includes(cb.value); });
    } else {
      document.getElementById('tab-stats').innerHTML = `
        <div class="card" style="padding:20px;text-align:center">
          <p class="muted">掲載者データが見つかりません。</p>
          <p style="font-size:13px;color:#6b7280">運営側より登録が完了次第、こちらに情報が表示されます。</p>
        </div>
      `;
    }

    document.getElementById('stat-views').textContent = '準備中';
    document.getElementById('stat-inquiries').textContent = '準備中';
    document.getElementById('stat-referrals').textContent = '準備中';

    // ── 公開設定トグル ───────────────────────────────────────────
    document.getElementById('publish-toggle-input').addEventListener('change', async function () {
      document.getElementById('publish-label').textContent = this.checked ? '公開中' : '非公開';
      await saveToLocal({ published: this.checked });
    });

    // ── フォーム保存 ─────────────────────────────────────────────
    async function saveToLocal(updates) {
      try {
        const raw = localStorage.getItem(PROVIDER_KEY);
        const d = raw ? JSON.parse(raw) : {};
        Object.assign(d, updates);
        localStorage.setItem(PROVIDER_KEY, JSON.stringify(d));
      } catch {}
      const token = getSupabaseToken();
      if (token) {
        try {
          const res = await fetch('/api/provider/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(updates)
          });
          if (res.ok) {
            const updated = await res.json();
            localStorage.setItem(PROVIDER_KEY, JSON.stringify(updated));
            showToast('保存しました');
          } else {
            showToast('保存しました（オフライン）');
          }
        } catch { showToast('保存しました（オフライン）'); }
      } else {
        showToast('保存しました');
      }
    }

    function showToast(msg) {
      try {
        const t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#111;color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;z-index:999';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
      } catch {}
    }

    document.getElementById('profile-form').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      saveToLocal(Object.fromEntries(fd));
    });

    document.getElementById('service-form').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      data.suitable_triggers = [...e.target.querySelectorAll('[name=suitable_triggers]:checked')].map(el => el.value);
      data.handles_failure_patterns = [...e.target.querySelectorAll('[name=handles_failure_patterns]:checked')].map(el => el.value);
      if (data.price_from) data.price_from = Number(data.price_from);
      saveToLocal(data);
    });

    // ── サービス（メニュー）管理 ─────────────────────────────────
    (function setupServices() {
      const token = getSupabaseToken();
      if (!token) return;
      const listEl = document.getElementById('services-list');
      const editCard = document.getElementById('service-edit-card');
      const editForm = document.getElementById('service-edit-form');
      const editTitle = document.getElementById('service-edit-title');

      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

      async function loadServices() {
        if (!listEl) return;
        const res = await fetch('/api/provider/services', { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) { listEl.innerHTML = '<p class="muted" style="color:#ef4444">取得エラー</p>'; return; }
        const items = await res.json();
        if (!items.length) { listEl.innerHTML = '<p class="muted">まだサービスがありません。「＋ 追加」から登録してください。</p>'; return; }
        listEl.innerHTML = '';
        items.forEach(s => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;padding:12px 0;border-bottom:1px solid #f3f4f6;gap:10px';
          row.innerHTML = `
            <div>
              <div style="font-weight:700;font-size:14px">${esc(s.name)} ${s.is_featured ? '<span style="font-size:11px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:99px">看板</span>' : ''}</div>
              <div style="font-size:13px;color:#6b7280">¥${Number(s.price).toLocaleString()}${s.duration ? ' · ' + esc(s.duration) : ''}</div>
              ${s.description ? `<div style="font-size:12px;color:#9ca3af;margin-top:2px">${esc(s.description)}</div>` : ''}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px" data-edit="${s.id}">編集</button>
              <button class="btn btn-ghost" style="font-size:12px;padding:4px 10px;color:#ef4444" data-del="${s.id}">削除</button>
            </div>`;
          listEl.appendChild(row);
        });
        listEl.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
          const s = items.find(x => x.id === btn.dataset.edit); if (!s) return;
          editTitle.textContent = 'サービスを編集'; editCard.style.display = 'block';
          editForm.elements['name'].value = s.name || ''; editForm.elements['price'].value = s.price || '';
          editForm.elements['duration'].value = s.duration || ''; editForm.elements['description'].value = s.description || '';
          editForm.elements['is_featured'].checked = !!s.is_featured; editForm.elements['_service_id'].value = s.id;
          const sImgPreview = document.getElementById('service-img-preview');
          const sImgPreviewWrap = document.getElementById('service-img-preview-wrap');
          const sImgUrl = document.getElementById('service-image-url');
          if (s.image_url) { if (sImgPreview) sImgPreview.src = s.image_url; if (sImgPreviewWrap) sImgPreviewWrap.style.display = 'block'; if (sImgUrl) sImgUrl.value = s.image_url; }
          else { if (sImgPreviewWrap) sImgPreviewWrap.style.display = 'none'; if (sImgUrl) sImgUrl.value = ''; }
          editCard.scrollIntoView({ behavior: 'smooth' });
        }));
        listEl.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', async () => {
          if (!confirm('このサービスを削除しますか？')) return;
          await fetch(`/api/provider/services/${btn.dataset.del}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          loadServices();
        }));
      }

      function resetServiceImgPreview() {
        const w = document.getElementById('service-img-preview-wrap'); if (w) w.style.display = 'none';
        const u = document.getElementById('service-image-url'); if (u) u.value = '';
        const m = document.getElementById('service-img-msg'); if (m) { m.style.display = 'none'; m.textContent = ''; }
      }
      document.getElementById('btn-add-service')?.addEventListener('click', () => {
        editTitle.textContent = 'サービスを追加'; editCard.style.display = 'block';
        editForm.reset(); editForm.elements['_service_id'].value = '';
        resetServiceImgPreview();
        editCard.scrollIntoView({ behavior: 'smooth' });
      });
      document.getElementById('service-cancel-btn')?.addEventListener('click', () => {
        editCard.style.display = 'none'; editForm.reset(); resetServiceImgPreview();
      });

      editForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(editForm);
        const id = fd.get('_service_id');
        const body = { name: fd.get('name'), price: Number(fd.get('price')), duration: fd.get('duration') || null, description: fd.get('description') || null, is_featured: !!editForm.elements['is_featured'].checked, image_url: fd.get('image_url') || null };
        const url = id ? `/api/provider/services/${id}` : '/api/provider/services';
        const res = await fetch(url, { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body) });
        if (res.ok) { editCard.style.display = 'none'; editForm.reset(); loadServices(); showToast('保存しました'); }
        else { const err = await res.json(); showToast('エラー: ' + (err.error || '不明')); }
      });

      document.querySelectorAll('[data-tab="service"]').forEach(btn => btn.addEventListener('click', loadServices, { once: false }));
      if (new URLSearchParams(location.search).get('tab') === 'service') loadServices();
    })();

    // ── 写真アップロード ─────────────────────────────────────────
    (function setupPhotoUpload() {
      const btn = document.getElementById('photo-upload-btn');
      const input = document.getElementById('photo-file-input');
      const preview = document.getElementById('photo-preview');
      const previewWrap = document.getElementById('photo-preview-wrap');
      const msg = document.getElementById('photo-upload-msg');
      const hiddenUrl = document.querySelector('[name=photo_url]');

      if (provider?.photo_url) { preview.src = provider.photo_url; previewWrap.style.display = 'block'; }
      if (hiddenUrl && provider?.photo_url) hiddenUrl.value = provider.photo_url;

      if (btn) btn.addEventListener('click', () => input?.click());
      if (!input) return;

      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        const token = getSupabaseToken();
        if (!token) { showToast('ログインが必要です'); return; }

        msg.textContent = 'アップロード中…'; msg.style.display = 'block'; btn.disabled = true;

        const fd = new FormData();
        fd.append('photo', file);
        try {
          const res = await fetch('/api/provider/upload-photo', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fd
          });
          const data = await res.json();
          if (res.ok && data.url) {
            preview.src = data.url; previewWrap.style.display = 'block';
            if (hiddenUrl) hiddenUrl.value = data.url;
            try { const raw = localStorage.getItem(PROVIDER_KEY); if (raw) { const d = JSON.parse(raw); d.photo_url = data.url; localStorage.setItem(PROVIDER_KEY, JSON.stringify(d)); } } catch {}
            msg.textContent = '✓ 写真を更新しました'; msg.style.color = '#059669';
          } else {
            msg.textContent = 'エラー: ' + (data.error || '不明'); msg.style.color = '#ef4444';
          }
        } catch (e) { msg.textContent = '通信エラーが発生しました'; msg.style.color = '#ef4444'; }
        btn.disabled = false;
        input.value = '';
      });
    })();

    // ── サービス画像アップロード ─────────────────────────────────
    (function setupServiceImageUpload() {
      const btn = document.getElementById('service-img-btn');
      const input = document.getElementById('service-img-input');
      const preview = document.getElementById('service-img-preview');
      const previewWrap = document.getElementById('service-img-preview-wrap');
      const msg = document.getElementById('service-img-msg');
      const hiddenUrl = document.getElementById('service-image-url');

      if (btn) btn.addEventListener('click', () => input?.click());
      if (!input) return;

      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        const token = getSupabaseToken();
        if (!token) { showToast('ログインが必要です'); return; }

        msg.textContent = 'アップロード中…'; msg.style.display = 'block'; btn.disabled = true;

        const fd = new FormData();
        fd.append('photo', file);
        try {
          const res = await fetch('/api/provider/upload-photo', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fd
          });
          const data = await res.json();
          if (res.ok && data.url) {
            preview.src = data.url; previewWrap.style.display = 'block';
            if (hiddenUrl) hiddenUrl.value = data.url;
            msg.textContent = '✓ 画像を設定しました'; msg.style.color = '#059669';
          } else {
            msg.textContent = 'エラー: ' + (data.error || '不明'); msg.style.color = '#ef4444';
          }
        } catch (e) { msg.textContent = '通信エラーが発生しました'; msg.style.color = '#ef4444'; }
        btn.disabled = false;
        input.value = '';
      });
    })();

    // ── 予約リクエスト管理 ────────────────────────────────────────
    const STATUS_LABELS = { pending: '返答待ち', approved: '承認済み', rejected: 'お断り', counter_proposed: '代替提案済み', visited: '来店確認済み' };
    const STATUS_COLORS = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', counter_proposed: '#6366f1', visited: '#059669' };
    const TIME_OPTIONS = ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

    function parseDateChoices(r) {
      const choices = [{ date: r.reserved_date || '', time: r.start_time || '', label: '第1希望' }];
      const note = r.note || '';
      const m2 = note.match(/【第2希望】(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/);
      const m3 = note.match(/【第3希望】(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/);
      if (m2) choices.push({ date: m2[1], time: m2[2], label: '第2希望' });
      if (m3) choices.push({ date: m3[1], time: m3[2], label: '第3希望' });
      return choices;
    }
    function noteWithoutChoices(note) {
      return (note || '').replace(/【第[23]希望】\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/g, '').replace(/【メニュー】[^\n]*/g, '').trim();
    }

    async function loadRequests() {
      const providerId = provider?.id || loadProviderData()?.id;
      if (!providerId) { document.getElementById('requests-list').innerHTML = '<p class="muted">掲載者IDが見つかりません。</p>'; return; }
      const res = await fetch(`/api/reservations?providerId=${providerId}`);
      if (!res.ok) { document.getElementById('requests-list').innerHTML = '<p class="muted" style="color:#ef4444">取得エラー</p>'; return; }
      const items = await res.json();
      const pending = items.filter(r => r.status === 'pending').length;
      const b = document.getElementById('requests-badge');
      if (b) { b.textContent = pending || ''; b.style.display = pending > 0 ? 'inline' : 'none'; }
      renderRequests(items);
    }

    function renderRequests(items) {
      const el = document.getElementById('requests-list');
      if (!items.length) { el.innerHTML = '<p class="muted">まだリクエストはありません。</p>'; return; }
      el.innerHTML = '';
      items.forEach(r => {
        const choices = parseDateChoices(r);
        const menuMatch = (r.note || '').match(/【メニュー】([^\n]+)/);
        const menuText = menuMatch ? menuMatch[1] : '';
        const userMsg = noteWithoutChoices(r.note);
        const statusColor = STATUS_COLORS[r.status] || '#6b7280';
        const statusLabel = STATUS_LABELS[r.status] || r.status;

        const choicesHtml = r.status === 'pending' ? choices.map((c, i) => `
          <label style="display:flex;align-items:center;gap:8px;padding:8px 12px;border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;margin-bottom:4px">
            <input type="radio" name="choice-${r.id}" value="${i}" ${i === 0 ? 'checked' : ''} style="accentColor:#10b981">
            <span style="font-size:13px;font-weight:700;color:#374151">${c.label}:</span>
            <span style="font-size:13px;color:#374151">${c.date} ${c.time}</span>
          </label>
        `).join('') : `<p style="font-size:13px;color:#6b7280">第1希望: ${choices[0].date} ${choices[0].time}${r.confirmed_date ? ` → 確定: ${r.confirmed_date} ${r.confirmed_time || ''}` : ''}</p>`;

        const card = document.createElement('div');
        card.style.cssText = 'border:1.5px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:12px;background:#fff';
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
                <strong style="font-size:15px">${esc(r.user_name)}</strong>
                <span style="font-size:11px;font-weight:700;padding:2px 10px;border-radius:99px;background:${statusColor}20;color:${statusColor}">${statusLabel}</span>
              </div>
              <p style="font-size:12px;color:#9ca3af;margin:0 0 10px">連絡先: ${esc(r.user_contact)}</p>
              ${menuText ? `<p style="font-size:13px;color:#374151;margin:0 0 8px;font-weight:700">🎯 ${esc(menuText)}</p>` : ''}
              <div style="margin-bottom:8px">${choicesHtml}</div>
              ${userMsg ? `<div style="font-size:13px;color:#374151;padding:8px 12px;background:#f9fafb;border-radius:8px;margin-bottom:8px">${esc(userMsg)}</div>` : ''}
              ${r.provider_comment ? `<div style="font-size:13px;color:#6366f1;padding:8px 12px;background:#eef2ff;border-radius:8px">掲載者コメント: ${esc(r.provider_comment)}</div>` : ''}
              ${r.counter_date ? `<div style="font-size:13px;color:#6366f1;padding:8px 12px;background:#eef2ff;border-radius:8px;margin-top:6px">代替提案日時: ${r.counter_date} ${r.counter_time || ''}</div>` : ''}
            </div>
            ${r.status === 'pending' ? `
            <div style="display:flex;flex-direction:column;gap:8px;flex-shrink:0;min-width:120px">
              <button class="btn" style="font-size:12px;padding:8px 14px;background:#10b981;white-space:nowrap" onclick="approveRequest('${r.id}')">✓ 承認する</button>
              <button class="btn btn-ghost" style="font-size:12px;padding:8px 14px;white-space:nowrap" onclick="showCounterModal('${r.id}')">代替提案を送る</button>
              <button class="btn btn-ghost" style="font-size:12px;padding:8px 14px;color:#ef4444;white-space:nowrap" onclick="rejectRequest('${r.id}')">お断り</button>
            </div>` : r.status === 'approved' ? `
            <button class="btn btn-ghost" style="font-size:12px;padding:8px 14px" onclick="markVisited('${r.id}')">来店確認</button>` : ''}
          </div>
        `;
        el.appendChild(card);
      });
    }

    function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    function getSelectedChoice(id) {
      const sel = document.querySelector(`input[name="choice-${id}"]:checked`);
      const idx = sel ? parseInt(sel.value) : 0;
      const card = sel ? sel.closest('[style]') : null;
      const labels = card ? card.querySelectorAll('label') : [];
      const choiceLabel = labels[idx];
      if (!choiceLabel) return null;
      const spans = choiceLabel.querySelectorAll('span');
      if (spans.length < 2) return null;
      const parts = spans[1].textContent.trim().split(' ');
      return { date: parts[0], time: parts[1] || '' };
    }

    window.approveRequest = async function (id) {
      const choice = getSelectedChoice(id);
      const body = { status: 'approved' };
      if (choice) { body.confirmed_date = choice.date; body.confirmed_time = choice.time; }
      const res = await fetch(`/api/reservations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
      await loadRequests(); showToast('承認しました');
    };

    window.rejectRequest = async function (id) {
      if (!confirm('このリクエストをお断りしますか？（ユーザーへ通知されます）')) return;
      const res = await fetch(`/api/reservations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'rejected' }) });
      if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
      await loadRequests(); showToast('お断りを送りました');
    };

    window.markVisited = async function (id) {
      if (!confirm('来店を確認しますか？')) return;
      const res = await fetch(`/api/reservations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'visited' }) });
      if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
      await loadRequests(); showToast('来店を確認しました');
    };

    window.showCounterModal = function (id) {
      const existing = document.getElementById('counter-modal-overlay');
      if (existing) existing.remove();
      const today = new Date().toISOString().split('T')[0];
      const timeOpts = TIME_OPTIONS.map(t => `<option value="${t}">${t}</option>`).join('');
      const overlay = document.createElement('div');
      overlay.id = 'counter-modal-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:18px;padding:28px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto">
          <h2 style="font-size:16px;font-weight:800;margin:0 0 6px">代替日時を提案する</h2>
          <p style="font-size:13px;color:#6b7280;margin:0 0 20px">希望に沿えない場合、別の日時を提案してください。ユーザーへメールで通知されます。</p>
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">提案日 *</label>
          <input id="counter-date-input" type="date" min="${today}" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;margin-bottom:12px">
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">提案時間 *</label>
          <select id="counter-time-input" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;margin-bottom:12px">
            <option value="">選択</option>${timeOpts}
          </select>
          <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">メッセージ（任意）</label>
          <textarea id="counter-msg-input" rows="3" placeholder="ご都合が合えばこちらの日時はいかがでしょうか" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;box-sizing:border-box;resize:vertical;margin-bottom:16px"></textarea>
          <div style="display:flex;gap:8px">
            <button onclick="submitCounter('${id}')" style="flex:1;padding:12px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">提案を送る</button>
            <button onclick="document.getElementById('counter-modal-overlay').remove()" style="padding:12px 16px;background:#f3f4f6;color:#374151;border:none;border-radius:10px;font-size:14px;cursor:pointer">キャンセル</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    };

    window.submitCounter = async function (id) {
      const date = document.getElementById('counter-date-input').value;
      const time = document.getElementById('counter-time-input').value;
      const msg = document.getElementById('counter-msg-input').value;
      if (!date || !time) { showToast('日付と時間を選択してください'); return; }
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'counter_proposed', counter_date: date, counter_time: time, counter_proposal: msg || null })
      });
      if (!res.ok) { const e = await res.json().catch(() => {}); showToast('エラー: ' + (e?.error || res.status)); return; }
      document.getElementById('counter-modal-overlay').remove();
      await loadRequests(); showToast('代替提案を送りました');
    };

    document.querySelectorAll('[data-tab="requests"]').forEach(btn => {
      btn.addEventListener('click', loadRequests, { once: false });
    });
    if (provider?.id || loadProviderData()?.id) setTimeout(loadRequests, 500);

    // ── LINE連携 ─────────────────────────────────────────────────
    (function setupLineConnect() {
      const providerId = provider?.id || loadProviderData()?.id;
      if (!providerId) return;

      const params = new URLSearchParams(location.search);
      if (params.get('line_connected') === '1') {
        showToast('LINEと連携しました！予約リクエスト時にLINE通知が届きます');
        history.replaceState({}, '', location.pathname);
        document.getElementById('line-connect-status').innerHTML = '<p style="color:#06c755;font-weight:700;margin:0">✓ LINE通知が設定済みです</p>';
        return;
      }
      if (params.get('line_error')) {
        showToast('LINE連携に失敗しました。もう一度お試しください');
        history.replaceState({}, '', location.pathname);
      }

      if (provider?.line_user_id) {
        document.getElementById('line-connect-status').innerHTML = '<p style="color:#06c755;font-weight:700;margin:0">✓ LINE通知が設定済みです</p>';
        return;
      }

      const btn = document.getElementById('line-connect-btn');
      if (btn) btn.href = `/api/provider/line-connect?provider_id=${encodeURIComponent(providerId)}`;
    })();

    // 紹介コードコピー（課金タブ内）
    document.getElementById('copy-referral').addEventListener('click', () => {
      const code = document.getElementById('referral-code').textContent;
      navigator.clipboard.writeText(code).then(() => showToast('コードをコピーしました')).catch(() => {});
    });

    // ── 紹介報酬タブ ─────────────────────────────────────────────
    (function setupReferralTab() {
      function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

      const fnCode = provider?.referral_code || '';
      const codeEl = document.getElementById('referral-code-tab');
      if (codeEl) codeEl.textContent = fnCode || '—';

      document.getElementById('copy-referral-code-btn')?.addEventListener('click', () => {
        if (!fnCode) { showToast('紹介コードが設定されていません'); return; }
        navigator.clipboard.writeText(fnCode).then(() => showToast('コードをコピーしました')).catch(() => {});
      });

      document.getElementById('copy-referral-url-btn')?.addEventListener('click', () => {
        if (!fnCode) { showToast('紹介コードが設定されていません'); return; }
        const url = `https://www.fineme.me/pages/provider/join.html?ref=${encodeURIComponent(fnCode)}`;
        navigator.clipboard.writeText(url).then(() => showToast('紹介URLをコピーしました')).catch(() => {});
      });

      async function loadReferrals() {
        const pid = provider?.id || loadProviderData()?.id;
        const listEl = document.getElementById('referral-list');
        if (!pid) { if (listEl) listEl.innerHTML = '<p class="muted">掲載者IDが見つかりません。</p>'; return; }

        try {
          const res = await fetch(`/api/billing/referrals?provider_id=${encodeURIComponent(pid)}`);
          if (!res.ok) { if (listEl) listEl.innerHTML = '<p class="muted" style="color:#ef4444">取得エラーが発生しました。</p>'; return; }
          const data = await res.json();
          const { referrals, summary } = data;

          const el = (id) => document.getElementById(id);
          if (el('ref-total-referred')) el('ref-total-referred').textContent = summary.total_referred;
          if (el('ref-active-count')) el('ref-active-count').textContent = summary.active_count;
          if (el('ref-pending-month')) el('ref-pending-month').textContent = '¥' + (summary.pending_this_month || 0).toLocaleString();
          if (el('ref-total-earned')) el('ref-total-earned').textContent = '¥' + (summary.total_earned_all_time || 0).toLocaleString();

          if (!listEl) return;
          if (!referrals.length) {
            listEl.innerHTML = '<p class="muted">まだ紹介した掲載者がいません。紹介URLを共有して報酬を獲得しましょう。</p>';
            return;
          }
          listEl.innerHTML = '';
          referrals.forEach(r => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:8px;gap:12px;flex-wrap:wrap;background:#fff';
            const statusBadge = r.status === 'active'
              ? '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#d1fae5;color:#065f46">課金中</span>'
              : '<span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;background:#f3f4f6;color:#6b7280">未課金</span>';
            const billingDate = r.billing_started
              ? `<span style="font-size:11px;color:#9ca3af">課金開始: ${esc(r.billing_started.slice(0, 10))}</span>`
              : '<span style="font-size:11px;color:#9ca3af">まだ課金なし</span>';
            row.innerHTML = `
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
                  <strong style="font-size:14px">${esc(r.referred_name)}</strong>
                  ${statusBadge}
                </div>
                ${billingDate}
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font-size:13px;font-weight:700;color:${r.status === 'active' ? '#6366f1' : '#9ca3af'}">¥500/月</div>
                <div style="font-size:11px;color:#6b7280">累計: ¥${(r.total_earned || 0).toLocaleString()}</div>
              </div>
            `;
            listEl.appendChild(row);
          });
        } catch (e) {
          if (listEl) listEl.innerHTML = '<p class="muted" style="color:#ef4444">通信エラーが発生しました。</p>';
        }
      }

      document.querySelectorAll('[data-tab="referral"]').forEach(btn => {
        btn.addEventListener('click', loadReferrals, { once: false });
      });
      if (new URLSearchParams(location.search).get('tab') === 'referral') loadReferrals();
    })();

    // ── パスワード変更 ────────────────────────────────────────────
    document.getElementById('pw-change-btn').addEventListener('click', async () => {
      const pw1 = document.getElementById('new-pw1').value;
      const pw2 = document.getElementById('new-pw2').value;
      const msg = document.getElementById('pw-change-msg');
      msg.style.display = 'none';
      if (pw1.length < 8) { msg.textContent = 'パスワードは8文字以上で入力してください'; msg.style.color = '#ef4444'; msg.style.display = 'block'; return; }
      if (pw1 !== pw2) { msg.textContent = 'パスワードが一致しません'; msg.style.color = '#ef4444'; msg.style.display = 'block'; return; }
      try {
        const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
        const session = key ? JSON.parse(localStorage.getItem(key)) : null;
        if (!session?.access_token) { msg.textContent = 'ログインセッションが見つかりません。再ログインしてください。'; msg.style.color = '#ef4444'; msg.style.display = 'block'; return; }
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        const sb = createClient('https://qsfpzlvucqzmjldshwwd.supabase.co', SUPABASE_ANON);
        const { error } = await sb.auth.updateUser({ password: pw1 });
        if (error) { msg.textContent = 'エラー: ' + error.message; msg.style.color = '#ef4444'; }
        else { msg.textContent = 'パスワードを変更しました'; msg.style.color = '#059669'; document.getElementById('new-pw1').value = ''; document.getElementById('new-pw2').value = ''; }
        msg.style.display = 'block';
      } catch (e) { msg.textContent = 'エラーが発生しました'; msg.style.color = '#ef4444'; msg.style.display = 'block'; }
    });

    // ── カスタマーポータル ────────────────────────────────────────
    document.getElementById('billing-portal-btn').addEventListener('click', async e => {
      e.preventDefault();
      try {
        const res = await fetch('/api/billing/portal-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerId: provider?.id || '' }) });
        const { url } = await res.json();
        if (url) window.location.href = url;
      } catch { showToast('ポータルへのアクセスに失敗しました'); }
    });

    return () => {
      try { document.head.removeChild(style); } catch {}
      // Clean up window globals
      delete window.approveRequest;
      delete window.rejectRequest;
      delete window.markVisited;
      delete window.showCounterModal;
      delete window.submitCounter;
    };
  }, []);

  return (
    <main className="section">
      <div className="container" style={{ maxWidth: '800px' }}>

        {/* ダッシュボードヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span id="provider-number-badge" style={{ display: 'none', fontSize: '13px', fontWeight: '800', padding: '3px 12px', background: '#111', color: '#fff', borderRadius: '99px' }}></span>
              <h1 className="section-title" style={{ margin: '0 0 4px' }} id="provider-name-header">掲載者ダッシュボード</h1>
            </div>
            <p className="muted" id="provider-page-link" style={{ margin: '0' }}></p>
          </div>
          <a id="view-page-btn" href="#" target="_blank" className="btn btn-ghost" style={{ fontSize: '13px' }}>自分のページを見る ↗</a>
        </div>

        {/* タブナビ */}
        <div className="tab-nav">
          <button className="tab-btn active" data-tab="stats">📊 概況</button>
          <button className="tab-btn" data-tab="requests">📬 予約リクエスト <span id="requests-badge" style={{ display: 'none', background: '#ef4444', color: '#fff', borderRadius: '99px', fontSize: '10px', padding: '1px 6px', marginLeft: '4px' }}></span></button>
          <button className="tab-btn" data-tab="profile">プロフィール</button>
          <button className="tab-btn" data-tab="service">サービス設定</button>
          <button className="tab-btn" data-tab="publish">公開設定</button>
          <button className="tab-btn" data-tab="billing">課金・プラン</button>
          <button className="tab-btn" data-tab="referral">紹介報酬</button>
        </div>

        {/* タブ①：概況 */}
        <div className="tab-pane active" id="tab-stats">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
            <div className="stat-card"><div className="stat-value" id="stat-views">—</div><div className="stat-label">今月のページ閲覧数</div></div>
            <div className="stat-card"><div className="stat-value" id="stat-inquiries">—</div><div className="stat-label">今月の問い合わせ数</div></div>
            <div className="stat-card"><div className="stat-value" id="stat-referrals">—</div><div className="stat-label">紹介報酬（今月）</div></div>
          </div>
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '15px' }}>Finemeからのメッセージ</h3>
            <p className="muted" style={{ margin: '0', lineHeight: '1.7' }}>順位は出しません。「合う人に届く」ことを大切にしています。プロフィールを丁寧に書くほど、あなたと合うユーザーが来やすくなります。</p>
            <a href="/provider/philosophy" className="btn btn-ghost" style={{ fontSize: '13px', marginTop: '12px', display: 'inline-block' }}>Finemeの考え方を見る</a>
          </div>

          {/* LINE通知設定カード */}
          <div className="card" style={{ padding: '20px', borderColor: '#06c755' }} id="line-connect-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '22px' }}>💬</span>
              <h3 style={{ margin: '0', fontSize: '15px' }}>LINE通知を設定する</h3>
            </div>
            <p className="muted" style={{ margin: '0 0 14px', fontSize: '13px', lineHeight: '1.6' }}>
              予約リクエストが届いたとき、LINEに通知が届くようになります。<br />
              ボタンを押してLINEでログインするだけで自動設定されます。
            </p>
            <div id="line-connect-status">
              <a id="line-connect-btn" href="#" className="btn" style={{ background: '#06c755', color: '#fff', border: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                LINEと連携する
              </a>
            </div>
          </div>
        </div>

        {/* タブ②：予約リクエスト */}
        <div className="tab-pane" id="tab-requests">
          <div className="card" style={{ padding: '20px' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: '16px' }}>予約リクエスト</h2>
            <div id="requests-list"><p className="muted">読み込み中…</p></div>
          </div>
        </div>

        {/* タブ③：プロフィール */}
        <div className="tab-pane" id="tab-profile">
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '16px' }}>基本情報</h2>
            <form id="profile-form">
              <div className="form-field"><label>掲載名 *</label><input name="name" required /></div>
              <div className="form-field"><label>キャッチコピー（一言で表すと？）</label><input name="catchphrase" placeholder="初デートで堂々としていたい男性のための3ヶ月プログラム" /></div>
              <div className="form-field"><label>こんな人に向いています</label><textarea name="target_desc" placeholder="どんな悩みを持つ方に向いているか、具体的に書いてください"></textarea></div>
              <div className="form-field"><label>このサービスが大切にしていること（哲学）</label><textarea name="philosophy" placeholder="あなたのサービスの考え方・スタイル・強みを自分の言葉で"></textarea></div>
              <div className="form-field">
                <label>プロフィール写真</label>
                <div id="photo-preview-wrap" style={{ marginBottom: '8px', display: 'none' }}>
                  <img id="photo-preview" src="" alt="現在の写真" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                </div>
                <input type="file" id="photo-file-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                <button type="button" id="photo-upload-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>📷 写真を選択・変更（5MB以内・jpg/png/webp）</button>
                <p id="photo-upload-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                <input type="hidden" name="photo_url" />
              </div>
              <button type="submit" className="btn" style={{ marginTop: '8px' }}>保存する</button>
            </form>
          </div>
        </div>

        {/* タブ④：サービス設定 */}
        <div className="tab-pane" id="tab-service">
          {/* サービス（メニュー）一覧 */}
          <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ margin: '0', fontSize: '16px' }}>サービス・メニュー</h2>
              <button type="button" className="btn" id="btn-add-service" style={{ fontSize: '13px', padding: '7px 14px' }}>＋ 追加</button>
            </div>
            <div id="services-list"><p className="muted">読み込み中…</p></div>
          </div>
          {/* サービス追加・編集フォーム */}
          <div className="card" id="service-edit-card" style={{ padding: '24px', marginBottom: '16px', display: 'none' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '15px' }} id="service-edit-title">サービスを追加</h3>
            <form id="service-edit-form">
              <div className="form-field"><label>サービス名 *</label><input name="name" required placeholder="例: 初回体験コース 60分" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-field"><label>価格（円）*</label><input name="price" type="number" required placeholder="5000" /></div>
                <div className="form-field"><label>所要時間</label><input name="duration" placeholder="例: 60分" /></div>
              </div>
              <div className="form-field"><label>説明</label><textarea name="description" placeholder="このサービスの内容・特徴"></textarea></div>
              <div className="form-field">
                <label>サービス画像</label>
                <div id="service-img-preview-wrap" style={{ marginBottom: '8px', display: 'none' }}>
                  <img id="service-img-preview" src="" alt="サービス画像" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e5e7eb' }} />
                </div>
                <input type="file" id="service-img-input" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} />
                <button type="button" id="service-img-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>📷 サービス画像を設定（任意）</button>
                <p id="service-img-msg" className="muted" style={{ fontSize: '12px', margin: '4px 0 0', display: 'none' }}></p>
                <input type="hidden" name="image_url" id="service-image-url" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <input type="checkbox" name="is_featured" id="is_featured" />
                <label htmlFor="is_featured" style={{ margin: '0', fontSize: '13px', fontWeight: '400' }}>看板メニューとして表示する</label>
              </div>
              <input type="hidden" name="_service_id" />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit" className="btn" id="service-save-btn">保存</button>
                <button type="button" className="btn btn-ghost" id="service-cancel-btn">キャンセル</button>
              </div>
            </form>
          </div>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '16px' }}>診断マッチング設定</h2>
            <form id="service-form">
              <div className="form-field"><label>サービス説明文（料金・メニューなど）</label><textarea name="description" placeholder="提供するサービスの詳細をここに書いてください"></textarea></div>
              <div className="form-field">
                <label>エリア</label>
                <select name="area">
                  <option value="">選択してください</option>
                  <optgroup label="東京">
                    <option value="東京・渋谷">渋谷</option>
                    <option value="東京・新宿">新宿</option>
                    <option value="東京・表参道">表参道・青山</option>
                    <option value="東京・銀座">銀座・有楽町</option>
                    <option value="東京・恵比寿">恵比寿・代官山</option>
                    <option value="東京・六本木">六本木</option>
                    <option value="東京・品川">品川</option>
                    <option value="東京・池袋">池袋</option>
                    <option value="東京・上野">上野・秋葉原</option>
                    <option value="東京・吉祥寺">吉祥寺・三鷹</option>
                    <option value="東京・その他">東京（その他）</option>
                  </optgroup>
                  <optgroup label="神奈川">
                    <option value="横浜">横浜</option>
                    <option value="川崎">川崎</option>
                  </optgroup>
                  <optgroup label="埼玉・千葉">
                    <option value="大宮・さいたま">大宮・さいたま</option>
                    <option value="千葉市">千葉市</option>
                  </optgroup>
                  <option value="オンライン">オンライン</option>
                </select>
              </div>
              <div className="form-field"><label>最低価格（円）</label><input name="price_from" type="number" placeholder="10000" /></div>
              <div className="form-field">
                <label>提供スタイル（診断との連動）</label>
                <select name="provider_style">
                  <option value="">選択してください</option>
                  <option value="explanation">納得してから動く人向け（理由を丁寧に説明するスタイル）</option>
                  <option value="consultation">相談しながら進めたい人向け</option>
                  <option value="delegate">任せて結果を出してほしい人向け</option>
                  <option value="cautious">小さく試したい人向け</option>
                </select>
                <small className="muted">これが診断タイプとの一致計算に使われます</small>
              </div>
              <div className="form-field">
                <label>得意なきっかけ（複数選択可）</label>
                <div className="checkbox-group">
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="matching_app" />マッチングアプリ</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="love" />恋愛・告白前</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="career" />就職・転職前</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="word" />一言が刺さった</label>
                  <label className="checkbox-item"><input type="checkbox" name="suitable_triggers" value="vague" />ずっと気になっていた</label>
                </div>
              </div>
              <div className="form-field">
                <label>得意な失敗パターン対応（複数選択可）</label>
                <div className="checkbox-group">
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="lost_direction" />方向を見失った方</label>
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="no_continuation" />続かなかった方</label>
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="cost" />コストで断念した方</label>
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="awkward" />関係性で悩んだ方</label>
                  <label className="checkbox-item"><input type="checkbox" name="handles_failure_patterns" value="no_result" />変化が感じられなかった方</label>
                </div>
              </div>
              <button type="submit" className="btn" style={{ marginTop: '8px' }}>保存する</button>
            </form>
          </div>
        </div>

        {/* タブ⑤：公開設定 */}
        <div className="tab-pane" id="tab-publish">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>公開設定</h2>
            <div className="publish-toggle">
              <label className="toggle-switch">
                <input type="checkbox" id="publish-toggle-input" />
                <span className="toggle-slider"></span>
              </label>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px' }} id="publish-label">非公開</div>
                <p className="muted" style={{ margin: '2px 0 0', fontSize: '13px' }}>非公開中はサイトに表示されませんが、月額費用は継続します。サービス内容の変更中や一時的に受付を止めたい場合にご利用ください。</p>
              </div>
            </div>
            <p className="muted" style={{ fontSize: '12px', margin: '0' }}>※ 掲載を完全に停止（解約）したい場合は「課金・プラン」タブからお手続きください。</p>
          </div>
        </div>

        {/* タブ⑥：課金・プラン */}
        <div className="tab-pane" id="tab-billing">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>課金・プラン</h2>
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>現在のプラン</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#111' }} id="billing-plan">読み込み中…</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }} id="billing-status"></div>
            </div>
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '700' }}>紹介報酬制度</div>
              <p className="muted" style={{ fontSize: '13px', margin: '0 0 10px' }}>あなたの紹介コードを共有すると、紹介した方が掲載を継続している限り¥500/月の報酬を受け取れます。</p>
              <div className="referral-code-box" id="referral-code">—</div>
              <button className="btn btn-ghost" style={{ fontSize: '13px', marginTop: '10px', width: '100%' }} id="copy-referral">コードをコピー</button>
            </div>
            <div style={{ padding: '14px 16px', border: '1.5px solid #e5e7eb', borderRadius: '12px', background: '#f9fafb', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 8px', fontWeight: '700' }}>プラン変更・解約について</p>
              <p className="muted" style={{ fontSize: '13px', margin: '0' }}>プランの変更や解約は、運営（Fineme）への申請が必要です。<br />下記よりご連絡ください。</p>
              <a href="mailto:contact@fineme.me?subject=プラン変更・解約申請" className="btn btn-ghost" style={{ marginTop: '12px', display: 'inline-block', fontSize: '13px' }}>contact@fineme.me に連絡する</a>
            </div>
            {/* billing-portal-btn: referenced in JS for Stripe customer portal */}
            <button id="billing-portal-btn" className="btn btn-ghost" style={{ fontSize: '13px' }}>カスタマーポータルを開く</button>
          </div>
          <div className="card stack" style={{ padding: '24px', gap: '14px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>パスワード変更</h2>
            <p className="muted" style={{ fontSize: '12px', margin: '0', padding: '8px 12px', background: '#f9fafb', borderRadius: '8px' }}>※ パスワードを変更すると、掲載者ダッシュボードとFinemeユーザーとしてのログイン、両方に適用されます。</p>
            <div className="form-field"><label>新しいパスワード（8文字以上）</label><input type="password" id="new-pw1" /></div>
            <div className="form-field"><label>新しいパスワード（確認）</label><input type="password" id="new-pw2" /></div>
            <p id="pw-change-msg" style={{ fontSize: '13px', margin: '0', display: 'none' }}></p>
            <button className="btn" id="pw-change-btn" style={{ alignSelf: 'flex-start' }}>パスワードを変更する</button>
          </div>
        </div>

        {/* タブ⑦：紹介報酬 */}
        <div className="tab-pane" id="tab-referral">
          <div className="card stack" style={{ padding: '24px', gap: '16px' }}>
            <h2 style={{ margin: '0', fontSize: '16px' }}>紹介報酬</h2>
            <p className="muted" style={{ fontSize: '13px', margin: '0', lineHeight: '1.7' }}>
              あなたの紹介コードを使ってFinemeに登録した掲載者が月額課金を継続している間、毎月¥500の報酬が発生します。
            </p>

            {/* 自分の紹介コード */}
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '700', marginBottom: '8px' }}>あなたの紹介コード</div>
              <div className="referral-code-box" id="referral-code-tab">—</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ fontSize: '13px', flex: '1' }} id="copy-referral-code-btn">コードをコピー</button>
                <button className="btn btn-ghost" style={{ fontSize: '13px', flex: '1' }} id="copy-referral-url-btn">紹介URLをコピー</button>
              </div>
            </div>

            {/* サマリーカード */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }} id="referral-summary-grid">
              <div className="stat-card"><div className="stat-value" id="ref-total-referred">—</div><div className="stat-label">紹介人数（合計）</div></div>
              <div className="stat-card"><div className="stat-value" id="ref-active-count">—</div><div className="stat-label">課金中の紹介者</div></div>
              <div className="stat-card"><div className="stat-value" id="ref-pending-month" style={{ color: '#6366f1' }}>—</div><div className="stat-label">今月の見込み報酬</div></div>
              <div className="stat-card"><div className="stat-value" id="ref-total-earned">—</div><div className="stat-label">累計報酬額</div></div>
            </div>

            {/* 紹介一覧テーブル */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 10px', color: '#374151' }}>紹介パートナー一覧</h3>
              <div id="referral-list"><p className="muted">読み込み中…</p></div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
