'use client';
import { useEffect, useRef } from 'react';

export default function ProviderRequestsPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);display:block;z-index:999}
.modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;z-index:1000}
.modal[hidden],.modal-backdrop[hidden]{display:none}
#decision-backdrop{opacity:0;transition:opacity .2s ease}
#decision-backdrop.is-open{opacity:1}
#decision-modal .modal-content{opacity:0;transform:translateY(8px) scale(.98);transition:opacity .2s ease,transform .2s ease;width:min(100%,520px)}
#decision-modal.is-open .modal-content{opacity:1;transform:none}
    `;
    document.head.appendChild(style);

    const REQUESTS_KEY = 'glowup:requests';
    const SERVICES_KEY = 'glowup:services';
    const SLOTS_KEY = 'glowup:slots';
    const PROVIDER_SESSION_KEY = 'glowup:providerSession';

    function $(s, root = document) { return root.querySelector(s); }
    function loadRequests() { try { const raw = localStorage.getItem(REQUESTS_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
    function saveRequests(list) {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(list));
      try {
        const cb = document.getElementById('requests-auto-export');
        if (cb instanceof HTMLInputElement && cb.checked) {
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `requests-backup-${ts}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        }
      } catch {}
    }
    function loadServices() { try { const raw = localStorage.getItem(SERVICES_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
    function loadSlots() { try { const raw = localStorage.getItem(SLOTS_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
    function saveSlots(list) { localStorage.setItem(SLOTS_KEY, JSON.stringify(list)); }
    function getSession() { try { const raw = sessionStorage.getItem(PROVIDER_SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }
    function loadProviders() { try { const raw = localStorage.getItem('glowup:providers'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
    function getProviderPlanMeta(providerId) {
      try { const p = loadProviders().find(x => x && x.id === providerId); const fee = p && p.plan && typeof p.plan.feeRate === 'number' ? Math.round(p.plan.feeRate * 100) : 7; return { commissionRate: fee }; } catch { return { commissionRate: 7 }; }
    }
    function getServicePrice(serviceId) { try { const s = loadServices().find(x => x && x.id === serviceId); return Number(s && (s.price != null ? s.price : (s.priceMin != null ? s.priceMin : 0))) || 0; } catch { return 0; } }
    function serviceName(id) { const s = loadServices().find(x => x.id === id); return s ? s.name : '不明'; }
    function escapeHtml(str) { return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }

    // Notifications helper (inlined)
    function addNotification(n) {
      try {
        const key = 'glowup:notifications';
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        arr.push({ ...n, id: Date.now().toString(36) + Math.random().toString(36).slice(2), createdAt: new Date().toISOString(), read: false });
        localStorage.setItem(key, JSON.stringify(arr));
      } catch {}
    }
    // createReservation helper (inlined from points.js)
    function createReservation(data) {
      try {
        const key = 'fineme:reservations:list';
        const arr = JSON.parse(localStorage.getItem(key) || '[]');
        const item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), ...data, status: 'approved', createdAt: Date.now() };
        arr.push(item); localStorage.setItem(key, JSON.stringify(arr)); return item;
      } catch { return null; }
    }

    function createStatusBadge(status) {
      const span = document.createElement('span'); span.className = 'badge';
      if (status === 'pending') { span.textContent = '未処理'; }
      else if (status === 'approved') { span.className = 'badge success'; span.textContent = '承認'; }
      else if (status === 'rejected') { span.className = 'badge muted'; span.textContent = '却下'; }
      else { span.textContent = String(status || ''); }
      return span;
    }

    function toStartDateTime(req) {
      try { return new Date(`${req.date}T${(req.start || '00:00')}:00`); } catch { return null; }
    }

    function sweepExpiredRequests() {
      const now = new Date(); const list = loadRequests(); let changed = 0;
      for (const r of list) {
        if (r.status === 'pending') { const d = toStartDateTime(r); if (d && d.getTime() <= now.getTime()) { r.status = 'expired'; r.autoCanceledAt = new Date().toISOString(); changed++; } }
      }
      if (changed) saveRequests(list); return changed;
    }

    function renderList() {
      const session = getSession(); if (!session) return;
      const tbody = $('#req-tbody'); if (!tbody) return;
      const expiredCount = sweepExpiredRequests();
      const filter = $('#req-filter')?.value || 'all';
      const all = loadRequests().filter(r => r.providerId === session.id);
      const list = (filter === 'pending') ? all.filter(r => r.status === 'pending') : all;
      tbody.textContent = '';
      if (!list || list.length === 0) {
        const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 9; td.className = 'muted'; td.textContent = '予約リクエストはありません。'; tr.appendChild(td); tbody.appendChild(tr);
        const m = $('#req-message'); if (expiredCount && m) m.textContent = `${expiredCount}件のリクエストを開始時刻経過のため自動キャンセルしました。`; return;
      }
      for (const r of list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
        const tr = document.createElement('tr');
        const addTd = (text) => { const td = document.createElement('td'); td.textContent = String(text || ''); tr.appendChild(td); };
        addTd(new Date(r.createdAt).toLocaleString('ja-JP'));
        addTd(r.serviceName || serviceName(r.serviceId));
        addTd(r.date ? `${r.date} ${r.start || ''}${r.end ? '-' + r.end : ''}` : '');
        addTd(r.userName);
        addTd(r.contact);
        addTd(r.note);
        addTd(r.providerComment);
        const tdStatus = document.createElement('td'); tdStatus.appendChild(createStatusBadge(r.status)); tr.appendChild(tdStatus);
        const tdAct = document.createElement('td'); tdAct.className = 'cluster'; tdAct.style.gap = '4px';
        if (r.status === 'pending') {
          const btnA = document.createElement('button'); btnA.className = 'btn btn-ghost'; btnA.setAttribute('data-action', 'approve'); btnA.setAttribute('data-id', r.id); btnA.textContent = '承認';
          const btnR = document.createElement('button'); btnR.className = 'btn btn-ghost'; btnR.setAttribute('data-action', 'reject'); btnR.setAttribute('data-id', r.id); btnR.textContent = '却下';
          tdAct.appendChild(btnA); tdAct.appendChild(btnR);
        } else if (r.status === 'approved') {
          const btnC = document.createElement('button'); btnC.className = 'btn btn-ghost'; btnC.setAttribute('data-action', 'cancel'); btnC.setAttribute('data-id', r.id); btnC.textContent = 'キャンセル';
          tdAct.appendChild(btnC);
        }
        tr.appendChild(tdAct); tbody.appendChild(tr);
      }
      const m = $('#req-message'); if (expiredCount && m) m.textContent = `${expiredCount}件のリクエストを開始時刻経過のため自動キャンセルしました。`;
    }

    function openDecisionModal({ id, action, summary }) {
      const bd = $('#decision-backdrop'); const modal = $('#decision-modal');
      const titleEl = document.getElementById('decision-title'); if (titleEl) titleEl.textContent = action === 'approve' ? '承認' : action === 'cancel' ? 'キャンセル' : '辞退';
      const sumEl = document.getElementById('decision-summary'); if (sumEl) sumEl.textContent = summary || '';
      const confirmBtn = document.getElementById('decision-confirm');
      if (confirmBtn) { confirmBtn.setAttribute('data-id', id); confirmBtn.setAttribute('data-action', action); }
      const commentEl = document.getElementById('decision-comment'); if (commentEl) commentEl.value = '';
      if (bd) { bd.hidden = false; requestAnimationFrame(() => bd.classList.add('is-open')); }
      if (modal) { modal.hidden = false; requestAnimationFrame(() => modal.classList.add('is-open')); }
    }
    function closeDecisionModal() {
      const bd = $('#decision-backdrop'); const modal = $('#decision-modal');
      if (bd) bd.classList.remove('is-open');
      if (modal) modal.classList.remove('is-open');
      setTimeout(() => { if (bd) bd.hidden = true; if (modal) modal.hidden = true; }, 180);
    }

    function onTableClick(e) {
      const btn = e.target.closest('button[data-action]'); if (!btn) return;
      const id = btn.getAttribute('data-id'); const act = btn.getAttribute('data-action');
      const session = getSession(); if (!session) return;
      const reqs = loadRequests(); const idx = reqs.findIndex(r => r.id === id && r.providerId === session.id); if (idx === -1) return;
      if (act === 'approve' || act === 'reject' || act === 'cancel') {
        const r = reqs[idx];
        const timeStr = r.end ? `${r.start}-${r.end}` : `${r.start}`;
        openDecisionModal({ id, action: act, summary: `${r.date} ${timeStr} / ${serviceName(r.serviceId)} / ${r.userName} 様` });
      }
    }

    // Filter
    const filterEl = document.getElementById('req-filter');
    if (filterEl) {
      try { if (filterEl instanceof HTMLSelectElement) filterEl.value = 'all'; } catch {}
      filterEl.addEventListener('change', renderList);
    }
    const tbody = document.getElementById('req-tbody');
    if (tbody) tbody.addEventListener('click', onTableClick);

    const importInput = document.getElementById('requests-import-input');
    if (importInput) {
      importInput.addEventListener('change', async (e) => {
        const input = e.target;
        const file = (input instanceof HTMLInputElement && input.files) ? input.files[0] : null;
        if (!file) return;
        const session = getSession(); if (!session) { alert('セッションが切れています。'); if (input) input.value = ''; return; }
        try {
          const text = await file.text(); const arr = JSON.parse(text);
          if (!Array.isArray(arr)) throw new Error('invalid');
          const current = loadRequests(); const byId = new Map(current.map(r => [r.id, r]));
          let added = 0, updated = 0, skipped = 0;
          const terminal = new Set(['approved', 'cancelled', 'expired', 'rejected']);
          for (const r of arr) {
            if (!r || typeof r !== 'object') { skipped++; continue; }
            if ((r.providerId || session.id) !== session.id) { skipped++; continue; }
            if (!r.serviceId || !r.date || !r.start || !r.end || !r.userName || !r.contact) { skipped++; continue; }
            if (r.id && byId.has(r.id)) {
              const idx = current.findIndex(x => x.id === r.id);
              if (idx !== -1) {
                const existed = current[idx]; const nextStatus = String(r.status || 'pending');
                const keepStatus = terminal.has(String(existed.status || '')) && !terminal.has(nextStatus);
                current[idx] = { ...existed, ...r, id: existed.id, providerId: session.id, status: keepStatus ? existed.status : nextStatus }; updated++;
              } else { skipped++; }
            } else {
              current.push({ id: r.id || (Math.random().toString(36).slice(2) + Date.now().toString(36)), providerId: session.id, serviceId: r.serviceId, slotId: r.slotId || '', date: r.date, start: r.start, end: r.end, userName: r.userName, contact: r.contact, note: r.note || '', providerComment: r.providerComment || '', status: String(r.status || 'pending'), createdAt: r.createdAt || new Date().toISOString() }); added++;
            }
          }
          saveRequests(current); renderList(); alert(`インポートしました。追加:${added}件 / 更新:${updated}件 / スキップ:${skipped}件`);
        } catch { alert('インポートに失敗しました。JSON形式をご確認ください。'); }
        finally { const inp = document.getElementById('requests-import-input'); if (inp instanceof HTMLInputElement) inp.value = ''; }
      });
    }

    const closeBtn = document.getElementById('decision-close'); if (closeBtn) closeBtn.addEventListener('click', closeDecisionModal);
    const cancelBtn = document.getElementById('decision-cancel'); if (cancelBtn) cancelBtn.addEventListener('click', closeDecisionModal);
    const confirmBtn = document.getElementById('decision-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const action = confirmBtn.getAttribute('data-action');
        const id = confirmBtn.getAttribute('data-id');
        const comment = (document.getElementById('decision-comment')?.value || '').toString();
        const session = getSession(); if (!session) return;
        const reqs = loadRequests(); const idx = reqs.findIndex(r => r.id === id && r.providerId === session.id); if (idx === -1) return;
        if (action === 'approve') {
          reqs[idx].status = 'approved'; reqs[idx].providerComment = comment;
          const slots = loadSlots(); const sidx = slots.findIndex(s => s.id === reqs[idx].slotId && s.providerId === session.id);
          if (sidx !== -1) { slots[sidx].open = false; saveSlots(slots); }
          saveRequests(reqs);
          try {
            const r = reqs[idx]; const { commissionRate } = getProviderPlanMeta(session.id); const price = getServicePrice(r.serviceId);
            const title = r.serviceName || serviceName(r.serviceId);
            const visitDate = (() => { try { return new Date(`${r.date}T${(r.start || '00:00')}:00`).toISOString(); } catch { return new Date().toISOString(); } })();
            const created = createReservation({ userId: String(r.userId || 'user'), storeId: String(session.id), title, price, commissionRate, visitDate, origin: 'detail' });
            if (created && created.id) { r.reservationId = created.id; const reqs2 = loadRequests(); const j = reqs2.findIndex(x => x.id === r.id); if (j !== -1) { reqs2[j] = r; saveRequests(reqs2); } }
          } catch (e) { console.warn('create reservation entry failed', e); }
          try {
            const r = reqs[idx]; const timeStr = r.end ? `${r.start}-${r.end}` : `${r.start}`;
            addNotification({ toType: 'user', toId: r.userId || null, title: '予約が承認されました', body: `${r.serviceName || serviceName(r.serviceId)} / ${r.date} ${timeStr} の予約が承認されました。`, data: { requestId: r.id } });
          } catch (e) { console.warn('notify approval failed', e); }
          const m = $('#req-message'); if (m) m.textContent = 'リクエストを承認しました。該当枠を受付停止にしました。';
        } else if (action === 'reject') {
          reqs[idx].status = 'rejected'; reqs[idx].providerComment = comment; saveRequests(reqs);
          try {
            const r = reqs[idx]; const timeStr = r.end ? `${r.start}-${r.end}` : `${r.start}`;
            addNotification({ toType: 'user', toId: r.userId || null, title: '予約が辞退されました', body: `${r.serviceName || serviceName(r.serviceId)} / ${r.date} ${timeStr} の予約が辞退されました。`, data: { requestId: r.id } });
          } catch (e) { console.warn('notify rejection failed', e); }
          const m = $('#req-message'); if (m) m.textContent = 'リクエストを辞退しました。';
        } else if (action === 'cancel') {
          const r = reqs[idx]; const start = toStartDateTime(r); const now = new Date();
          if (start && now.getTime() >= start.getTime()) { const m = $('#req-message'); if (m) m.textContent = '開始時刻を過ぎたためキャンセルできません。'; closeDecisionModal(); return; }
          const wasApproved = r.status === 'approved';
          r.status = 'cancelled'; r.providerComment = comment; r.providerCanceledAt = new Date().toISOString(); saveRequests(reqs);
          try {
            const timeStr = r.end ? `${r.start}-${r.end}` : `${r.start}`;
            let body = `${r.serviceName || serviceName(r.serviceId)} / ${r.date} ${timeStr} の予約がキャンセルされました。`;
            if (comment) body += ` 理由: ${escapeHtml(comment)}`;
            addNotification({ toType: 'user', toId: r.userId || null, title: '予約がキャンセルされました', body, data: { requestId: r.id } });
          } catch (e) { console.warn('notify cancel failed', e); }
          try {
            const key = 'fineme:reservations:list'; const raw = localStorage.getItem(key); const arr = raw ? JSON.parse(raw) : []; let changed = false;
            if (r.reservationId) { const rx = arr.find(x => x && x.id === r.reservationId); if (rx) { rx.status = 'canceled'; rx.updatedAt = Date.now(); changed = true; } }
            if (!changed) {
              const visitIso = (() => { try { return new Date(`${r.date}T${(r.start || '00:00')}:00`).toISOString(); } catch { return ''; } })();
              const cand = arr.find(x => String(x.storeId || '') === String(session.id) && String(x.userId || '') === String(r.userId || '') && String(x.visitDate || '') === visitIso && String(x.status || '') !== 'canceled');
              if (cand) { cand.status = 'canceled'; cand.updatedAt = Date.now(); changed = true; }
            }
            if (changed) localStorage.setItem(key, JSON.stringify(arr));
          } catch (e) { console.warn('reflect reservation cancel failed', e); }
          if (wasApproved) { const slots = loadSlots(); const sidx = slots.findIndex(s => s.id === r.slotId && s.providerId === session.id); if (sidx !== -1) { slots[sidx].open = true; saveSlots(slots); } }
          const m = $('#req-message'); if (m) m.textContent = '予約をキャンセルしました。';
        }
        closeDecisionModal(); renderList();
      });
    }

    // Auto export toggle
    try {
      const key = 'glowup:requests:autoExport';
      const cb = document.getElementById('requests-auto-export');
      if (cb instanceof HTMLInputElement) {
        const saved = localStorage.getItem(key);
        cb.checked = saved === null ? false : saved === '1';
        if (saved === null) localStorage.setItem(key, '0');
        cb.addEventListener('change', () => localStorage.setItem(key, cb.checked ? '1' : '0'));
      }
    } catch {}

    renderList();

    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  return (
    <main className="section">
      <div className="container stack" style={{ maxWidth: '1000px' }}>
        <h1 className="section-title">予約リクエスト</h1>
        <p className="muted">ユーザーからの予約リクエストを確認し、承認/辞退を選択できます（ブラウザ保存・デモ）。</p>

        <div className="card" style={{ padding: '16px' }}>
          <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div className="cluster" style={{ gap: '8px', alignItems: 'center' }}>
              <label className="muted">表示フィルター</label>
              <select id="req-filter">
                <option value="pending">未処理（保留）</option>
                <option value="all">すべて</option>
              </select>
            </div>
            <div className="cluster" style={{ gap: '8px', flexWrap: 'wrap' }}>
              <label htmlFor="requests-import-input" className="btn btn-ghost" style={{ margin: 0 }}>インポート</label>
              <input id="requests-import-input" type="file" accept="application/json" style={{ display: 'none' }} />
            </div>
            <label className="cluster" style={{ alignItems: 'center', gap: '8px' }}>
              <input id="requests-auto-export" type="checkbox" />
              <span className="muted">保存時に自動バックアップ（ダウンロード）</span>
            </label>
            <span id="req-message" className="muted" aria-live="polite"></span>
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="table responsive" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>受付日時</th>
                  <th>サービス</th>
                  <th>希望日時</th>
                  <th>お客様</th>
                  <th>連絡先</th>
                  <th>メモ</th>
                  <th>店舗コメント</th>
                  <th>状態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="req-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Decision modal */}
      <div id="decision-backdrop" className="modal-backdrop" hidden></div>
      <div id="decision-modal" className="modal" role="dialog" aria-modal="true" aria-labelledby="decision-title" hidden>
        <div className="modal-content card" style={{ padding: '20px' }}>
          <div className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 id="decision-title" style={{ margin: 0 }}>対応</h2>
            <button id="decision-close" className="btn btn-ghost" type="button" aria-label="閉じる">×</button>
          </div>
          <div className="stack" style={{ gap: '12px' }}>
            <p className="muted" id="decision-summary"></p>
            <label>コメント（任意）
              <textarea id="decision-comment" rows={4} placeholder="お客様に伝える補足があれば入力してください"></textarea>
            </label>
            <div className="cluster" style={{ justifyContent: 'flex-end' }}>
              <button id="decision-cancel" className="btn btn-ghost" type="button">キャンセル</button>
              <button id="decision-confirm" className="btn" type="button" data-action="">確定</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
