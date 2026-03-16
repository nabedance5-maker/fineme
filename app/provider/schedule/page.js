'use client';
import { useEffect, useRef } from 'react';

export default function ProviderSchedulePage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Inline all logic from provider-schedule.js
    const SERVICES_KEY = 'glowup:services';
    const PROVIDER_SESSION_KEY = 'glowup:providerSession';
    const SLOTS_KEY = 'glowup:slots';
    const TEMPLATES_KEY = 'glowup:slotTemplates';

    function $(s, root = document) { return root.querySelector(s); }
    function getSession() { try { const raw = sessionStorage.getItem(PROVIDER_SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }
    function loadServices() { try { const raw = localStorage.getItem(SERVICES_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
    function loadSlots() { try { const raw = localStorage.getItem(SLOTS_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
    function saveSlots(list) {
      localStorage.setItem(SLOTS_KEY, JSON.stringify(list));
      try {
        const cb = document.getElementById('slots-auto-export');
        if (cb instanceof HTMLInputElement && cb.checked) {
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `slots-backup-${ts}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        }
      } catch {}
    }
    function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
    function pad2(n) { return String(n).padStart(2, '0'); }
    function fmtDate(y, m, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }
    function endOfMonth(date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0); }
    function startOfWeek(d) { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); x.setHours(0, 0, 0, 0); return x; }
    function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function addMinutes(hhmm, minutes) {
      const [h, m] = hhmm.split(':').map(Number);
      const base = new Date(2000, 0, 1, h, m, 0);
      const out = new Date(base.getTime() + minutes * 60000);
      return `${pad2(out.getHours())}:${pad2(out.getMinutes())}`;
    }
    function serviceName(id) { const s = loadServices().find(x => x.id === id); return s ? s.name : '未指定'; }

    // Calendar state
    let viewYear, viewMonth, viewDate, calView = 'month';

    function renderCalendar() {
      const container = $('#calendar');
      const title = $('#cal-title');
      const session = getSession();
      if (!container || !title || !session) return;
      const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];
      container.textContent = '';
      if (calView === 'month') {
        const first = new Date(viewYear, viewMonth, 1);
        const last = endOfMonth(first);
        title.textContent = `${viewYear}年 ${viewMonth + 1}月`;
        const startWeekday = first.getDay();
        const days = last.getDate();
        const grid = document.createElement('div'); grid.className = 'cal-grid';
        for (const w of weekLabels) { const h = document.createElement('div'); h.className = 'cal-cell cal-head'; h.textContent = w; grid.appendChild(h); }
        for (let i = 0; i < startWeekday; i++) { const e = document.createElement('div'); e.className = 'cal-cell cal-empty'; grid.appendChild(e); }
        for (let d = 1; d <= days; d++) {
          const dateStr = fmtDate(viewYear, viewMonth, d);
          const count = loadSlots().filter(s => s.providerId === session.id && s.date === dateStr).length;
          const btn = document.createElement('button'); btn.className = 'cal-cell cal-day'; btn.setAttribute('data-date', dateStr);
          const spanDate = document.createElement('span'); spanDate.className = 'cal-date'; spanDate.textContent = String(d);
          btn.appendChild(spanDate);
          if (count) { const badge = document.createElement('span'); badge.className = 'cal-badge'; badge.textContent = String(count); btn.appendChild(badge); }
          grid.appendChild(btn);
        }
        container.appendChild(grid);
      } else if (calView === 'week') {
        const ws = startOfWeek(viewDate || new Date());
        const we = addDays(ws, 6);
        title.textContent = `${ws.getFullYear()}年 ${ws.getMonth() + 1}月 ${ws.getDate()}日 〜 ${we.getMonth() + 1}月 ${we.getDate()}日`;
        const grid = document.createElement('div'); grid.className = 'cal-grid';
        for (const w of weekLabels) { const h = document.createElement('div'); h.className = 'cal-cell cal-head'; h.textContent = w; grid.appendChild(h); }
        for (let i = 0; i < 7; i++) {
          const d = addDays(ws, i);
          const ds = d.toISOString().slice(0, 10);
          const count = loadSlots().filter(s => s.providerId === session.id && s.date === ds).length;
          const btn = document.createElement('button'); btn.className = 'cal-cell cal-day'; btn.setAttribute('data-date', ds);
          const spanDate = document.createElement('span'); spanDate.className = 'cal-date'; spanDate.textContent = String(d.getDate()); btn.appendChild(spanDate);
          if (count) { const badge = document.createElement('span'); badge.className = 'cal-badge'; badge.textContent = String(count); btn.appendChild(badge); }
          grid.appendChild(btn);
        }
        container.appendChild(grid);
      } else {
        const d = viewDate || new Date();
        title.textContent = `${d.getFullYear()}年 ${d.getMonth() + 1}月 ${d.getDate()}日（${['日', '月', '火', '水', '木', '金', '土'][d.getDay()]}）`;
        const card = document.createElement('div'); card.className = 'card'; card.style.padding = '12px';
        const s = document.createElement('strong'); s.textContent = (viewDate || new Date()).toISOString().slice(0, 10);
        card.appendChild(document.createTextNode('選択日: ')); card.appendChild(s);
        container.appendChild(card);
      }
      container.addEventListener('click', onCalendarClick);
    }

    function onCalendarClick(e) {
      const btn = e.target.closest('.cal-day');
      if (!btn) return;
      const date = btn.getAttribute('data-date');
      const input = $('#selected-date');
      if (input) { input.value = date; }
      renderSlotsList();
    }

    function renderServiceOptions() {
      const session = getSession();
      const sel = $('#service-select');
      if (!sel || !session) return;
      const services = loadServices().filter(s => s.providerId === session.id);
      sel.textContent = '';
      if (services.length === 0) {
        const opt = document.createElement('option'); opt.value = ''; opt.textContent = '（サービス未登録）'; sel.appendChild(opt);
        sel.disabled = true;
        const m1 = $('#slot-msg'); if (m1) m1.textContent = '対象サービスがありません。先に「サービス」ページでサービスを作成してください。';
        const m2 = $('#bulk-msg'); if (m2) m2.textContent = '対象サービスがありません。先に「サービス」ページでサービスを作成してください。';
      } else {
        sel.disabled = false;
        const allOpt = document.createElement('option'); allOpt.value = ''; allOpt.textContent = 'すべて'; sel.appendChild(allOpt);
        for (const svc of services) { const o = document.createElement('option'); o.value = svc.id; o.textContent = svc.name || ''; sel.appendChild(o); }
        sel.value = services[0]?.id || '';
        const m1 = $('#slot-msg'); if (m1) m1.textContent = '';
        const m2 = $('#bulk-msg'); if (m2) m2.textContent = '';
      }
    }

    function renderSlotsList() {
      const session = getSession();
      const date = $('#selected-date')?.value;
      const list = $('#slots-list');
      const selSvc = $('#service-select')?.value;
      if (!session || !date || !list) return;
      const all = loadSlots().filter(s => s.providerId === session.id && s.date === date && (!selSvc || s.serviceId === selSvc));
      if (all.length === 0) { list.textContent = ''; const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'この日の枠はありません。'; list.appendChild(p); return; }
      const sorted = all.sort((a, b) => a.start.localeCompare(b.start));
      list.textContent = '';
      const actionBar = document.createElement('div'); actionBar.className = 'cluster'; actionBar.style.justifyContent = 'space-between'; actionBar.style.alignItems = 'center';
      const left = document.createElement('div'); left.className = 'cluster'; left.style.gap = '8px';
      const label = document.createElement('label'); label.className = 'cluster'; label.style.gap = '6px';
      const selAll = document.createElement('input'); selAll.type = 'checkbox'; selAll.id = 'sel-all';
      label.appendChild(selAll); label.appendChild(document.createTextNode(' 全選択'));
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

      for (const s of sorted) {
        const open = (typeof s.open === 'undefined') ? true : !!s.open;
        const row = document.createElement('div'); row.className = 'cluster slot-item ' + (open ? '' : 'is-closed'); row.style.justifyContent = 'space-between';
        const leftc = document.createElement('div'); leftc.className = 'cluster'; leftc.style.gap = '8px'; leftc.style.alignItems = 'center';
        const chk = document.createElement('input'); chk.type = 'checkbox'; chk.className = 'slot-check'; chk.setAttribute('data-id', s.id);
        const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = `${s.start} - ${s.end}`;
        const capSpan = document.createElement('span'); capSpan.className = 'muted'; capSpan.textContent = `定員 ${s.cap}`;
        const svcSpan = document.createElement('span'); svcSpan.className = 'muted'; svcSpan.textContent = `サービス: ${serviceName(s.serviceId)}`;
        leftc.appendChild(chk); leftc.appendChild(badge); leftc.appendChild(capSpan); leftc.appendChild(svcSpan);
        if (!open) { const closed = document.createElement('span'); closed.className = 'slot-badge-closed'; closed.textContent = '受付停止'; leftc.appendChild(closed); }
        const rightc = document.createElement('div'); rightc.className = 'cluster'; rightc.style.gap = '8px';
        const delBtn = document.createElement('button'); delBtn.className = 'btn btn-ghost'; delBtn.setAttribute('data-action', 'delete'); delBtn.setAttribute('data-id', s.id); delBtn.textContent = '削除';
        rightc.appendChild(delBtn);
        row.appendChild(leftc); row.appendChild(rightc);
        list.appendChild(row);
      }

      const updateCount = () => {
        const checks = list.querySelectorAll('.slot-check:checked');
        const cnt = checks.length; const el = list.querySelector('#sel-count'); if (el) el.textContent = `${cnt}件選択`;
        const sa = list.querySelector('#sel-all'); if (sa) { sa.checked = cnt > 0 && cnt === list.querySelectorAll('.slot-check').length; }
      };
      list.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'sel-all') { const on = e.target.checked; list.querySelectorAll('.slot-check').forEach(ch => ch.checked = on); updateCount(); }
        if (e.target && e.target.classList.contains('slot-check')) { updateCount(); }
      });
      list.addEventListener('click', (e) => {
        const btn = e.target.closest('button'); if (!btn) return;
        const allSlots = loadSlots();
        if (btn.id === 'bulk-delete' || btn.getAttribute('data-action') === 'delete') {
          const ids = btn.id === 'bulk-delete' ? Array.from(list.querySelectorAll('.slot-check:checked')).map(x => x.getAttribute('data-id')) : [btn.getAttribute('data-id')];
          if (ids.length === 0) return;
          let changed = false;
          for (const id of ids) { const idx = allSlots.findIndex(x => x.id === id); if (idx !== -1) { allSlots.splice(idx, 1); changed = true; } }
          if (changed) { saveSlots(allSlots); renderSlotsList(); renderCalendar(); }
        } else if (btn.id === 'bulk-stop' || btn.id === 'bulk-open') {
          const ids = Array.from(list.querySelectorAll('.slot-check:checked')).map(x => x.getAttribute('data-id'));
          if (ids.length === 0) return;
          const toOpen = (btn.id === 'bulk-open');
          let changed = false;
          for (const id of ids) { const s = allSlots.find(x => x.id === id); if (s) { if (typeof s.open === 'undefined' ? !toOpen : s.open !== toOpen) { s.open = toOpen; changed = true; } } }
          if (changed) { saveSlots(allSlots); renderSlotsList(); renderCalendar(); }
        }
      });
      updateCount();
    }

    function addSingleSlot() {
      const session = getSession();
      const date = $('#selected-date')?.value;
      const start = $('#slot-start')?.value;
      const end = $('#slot-end')?.value;
      const cap = Number($('#slot-cap')?.value || 1);
      const svcId = $('#service-select')?.value || '';
      const msg = $('#slot-msg');
      if (!session) { if (msg) msg.textContent = 'セッションが切れています。再ログインしてください。'; return; }
      if (!svcId) { if (msg) msg.textContent = '対象サービスを選択してください。'; return; }
      if (!date) { if (msg) msg.textContent = '日付を選択してください。'; return; }
      if (!start || !end) { if (msg) msg.textContent = '開始・終了時刻を入力してください。'; return; }
      if (end <= start) { if (msg) msg.textContent = '終了は開始より後にしてください。'; return; }
      const all = loadSlots();
      all.push({ id: uuid(), providerId: session.id, serviceId: svcId, date, start, end, cap: isNaN(cap) ? 1 : cap, open: true });
      saveSlots(all);
      if (msg) msg.textContent = '枠を追加しました。';
      renderSlotsList(); renderCalendar();
    }

    function bulkGenerate() {
      const session = getSession();
      const from = $('#bulk-from')?.value; const to = $('#bulk-to')?.value;
      const which = $('#bulk-days')?.value || 'weekdays';
      const start = $('#bulk-start')?.value || '10:00';
      const end = $('#bulk-end')?.value || '19:00';
      const interval = Number($('#bulk-interval')?.value || 60);
      const cap = Number($('#bulk-cap')?.value || 1);
      const svcId = $('#service-select')?.value || '';
      const msg = $('#bulk-msg');
      if (!session) { if (msg) msg.textContent = 'セッションが切れています。'; return; }
      if (!svcId) { if (msg) msg.textContent = '対象サービスを選択してください。'; return; }
      if (!from || !to) { if (msg) msg.textContent = '開始日と終了日を入力してください。'; return; }
      if (end <= start) { if (msg) msg.textContent = '終了は開始より後にしてください。'; return; }
      if (isNaN(interval) || interval <= 0) { if (msg) msg.textContent = '間隔を正しく入力してください。'; return; }
      const fromD = new Date(from); const toD = new Date(to);
      if (toD < fromD) { if (msg) msg.textContent = '終了日は開始日以降にしてください。'; return; }
      const all = loadSlots();
      for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
        const dow = d.getDay(); const isWeekend = (dow === 0 || dow === 6);
        if (which === 'weekdays' && isWeekend) continue;
        if (which === 'weekends' && !isWeekend) continue;
        let cur = start;
        while (cur < end) {
          const next = addMinutes(cur, interval);
          if (next > end) break;
          all.push({ id: uuid(), providerId: session.id, serviceId: svcId, date: d.toISOString().slice(0, 10), start: cur, end: next, cap: isNaN(cap) ? 1 : cap, open: true });
          cur = next;
        }
      }
      saveSlots(all);
      if (msg) msg.textContent = '一括生成しました。';
      renderSlotsList(); renderCalendar();
    }

    // Templates
    function loadTemplates() { try { const raw = localStorage.getItem(TEMPLATES_KEY); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; } }
    function saveTemplates(arr) { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(arr)); }
    function refreshTemplateSelect() {
      const sel = $('#tpl-select'); if (!sel) return;
      const list = loadTemplates(); sel.textContent = '';
      if (!list.length) { const opt = document.createElement('option'); opt.value = ''; opt.textContent = '（テンプレ無し）'; sel.appendChild(opt); return; }
      for (let i = 0; i < list.length; i++) { const t = list[i]; const opt = document.createElement('option'); opt.value = String(i); opt.textContent = `${t.name || '(無題)'}（${(t.items && t.items.length) ? t.items.length : 0}件）`; sel.appendChild(opt); }
    }
    function collectDaySlotsForTemplate() {
      const session = getSession(); const date = $('#selected-date')?.value; const svcId = $('#service-select')?.value || '';
      if (!session || !date || !svcId) return [];
      return loadSlots().filter(s => s.providerId === session.id && s.date === date && s.serviceId === svcId).map(s => ({ start: s.start, end: s.end, cap: s.cap }));
    }
    function applyTemplateToDate(tpl, targetDate) {
      const session = getSession(); const svcId = $('#service-select')?.value || '';
      if (!session || !svcId) return { added: 0 };
      const all = loadSlots(); let added = 0;
      for (const it of (tpl.items || [])) { all.push({ id: uuid(), providerId: session.id, serviceId: svcId, date: targetDate, start: it.start, end: it.end, cap: Number(it.cap) || 1, open: true }); added++; }
      saveSlots(all); return { added };
    }

    // Import
    async function importSlotsFile(e) {
      const input = e.target;
      const file = (input instanceof HTMLInputElement && input.files) ? input.files[0] : null;
      if (!file) return;
      const session = getSession();
      if (!session) { alert('セッションが切れています。再ログインしてください。'); if (input) input.value = ''; return; }
      try {
        const text = await file.text();
        const arr = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error('invalid');
        const current = loadSlots();
        const byId = new Map(current.map(s => [s.id, s]));
        let added = 0, updated = 0, skipped = 0;
        for (const s of arr) {
          if (!s || typeof s !== 'object') { skipped++; continue; }
          if ((s.providerId || session.id) !== session.id) { skipped++; continue; }
          const date = String(s.date || ''); const start = String(s.start || ''); const end = String(s.end || ''); const serviceId = String(s.serviceId || ''); const cap = Number(s.cap || 1);
          if (!date || !start || !end || !serviceId || isNaN(cap) || cap <= 0) { skipped++; continue; }
          if (s.id && byId.has(s.id)) {
            const idx = current.findIndex(x => x.id === s.id);
            if (idx !== -1) { current[idx] = { ...current[idx], date, start, end, serviceId, cap, open: typeof s.open === 'undefined' ? !!current[idx].open : !!s.open, providerId: session.id, id: current[idx].id }; updated++; } else { skipped++; }
          } else {
            const dupIdx = current.findIndex(x => x.providerId === session.id && x.date === date && x.start === start && x.end === end && x.serviceId === serviceId);
            if (dupIdx !== -1) { current[dupIdx] = { ...current[dupIdx], date, start, end, serviceId, cap, open: typeof s.open === 'undefined' ? !!current[dupIdx].open : !!s.open, providerId: session.id }; updated++; }
            else { current.push({ id: uuid(), providerId: session.id, serviceId, date, start, end, cap, open: typeof s.open === 'undefined' ? true : !!s.open }); added++; }
          }
        }
        saveSlots(current); renderSlotsList(); renderCalendar();
        alert(`インポートしました。追加:${added}件 / 更新:${updated}件 / スキップ:${skipped}件`);
      } catch { alert('インポートに失敗しました。JSON形式をご確認ください。'); }
      finally { const inp = document.getElementById('slots-import-input'); if (inp instanceof HTMLInputElement) inp.value = ''; }
    }

    // Calendar styles
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
.slot-item.is-closed { opacity: .75; }
.slot-badge-closed { background: #fee2e2; color: #b91c1c; border-radius: 999px; padding: 2px 8px; font-size: 12px; }
    `;
    document.head.appendChild(style);

    // Init
    const session = getSession();
    if (!session) return;
    const now = new Date(); viewYear = now.getFullYear(); viewMonth = now.getMonth(); viewDate = new Date(now);

    $('#prev-month')?.addEventListener('click', () => {
      if (calView === 'month') { if (--viewMonth < 0) { viewMonth = 11; viewYear--; } }
      else if (calView === 'week') { viewDate = addDays(viewDate, -7); const sd = $('#selected-date'); if (sd) sd.value = viewDate.toISOString().slice(0, 10); renderSlotsList(); }
      else { viewDate = addDays(viewDate, -1); const sd = $('#selected-date'); if (sd) sd.value = viewDate.toISOString().slice(0, 10); renderSlotsList(); }
      renderCalendar();
    });
    $('#next-month')?.addEventListener('click', () => {
      if (calView === 'month') { if (++viewMonth > 11) { viewMonth = 0; viewYear++; } }
      else if (calView === 'week') { viewDate = addDays(viewDate, 7); const sd = $('#selected-date'); if (sd) sd.value = viewDate.toISOString().slice(0, 10); renderSlotsList(); }
      else { viewDate = addDays(viewDate, 1); const sd = $('#selected-date'); if (sd) sd.value = viewDate.toISOString().slice(0, 10); renderSlotsList(); }
      renderCalendar();
    });
    $('#today-btn')?.addEventListener('click', () => { const n = new Date(); viewYear = n.getFullYear(); viewMonth = n.getMonth(); viewDate = new Date(n); const sd = $('#selected-date'); if (sd) sd.value = n.toISOString().slice(0, 10); renderCalendar(); renderSlotsList(); });

    function setView(v) {
      calView = v;
      [['#view-month', 'month'], ['#view-week', 'week'], ['#view-day', 'day']].forEach(([sel, name]) => {
        const b = $(sel); if (b) b.setAttribute('aria-pressed', (name === v) ? 'true' : 'false');
      });
      renderCalendar();
    }
    $('#view-month')?.addEventListener('click', () => setView('month'));
    $('#view-week')?.addEventListener('click', () => setView('week'));
    $('#view-day')?.addEventListener('click', () => setView('day'));
    setView('month');
    $('#add-slot')?.addEventListener('click', addSingleSlot);
    $('#bulk-generate')?.addEventListener('click', bulkGenerate);
    $('#service-select')?.addEventListener('change', renderSlotsList);

    const importInput = document.getElementById('slots-import-input');
    if (importInput) importInput.addEventListener('change', importSlotsFile);

    // Template UI
    const saveBtn = $('#tpl-save'); const applyBtn = $('#tpl-apply'); const delBtn = $('#tpl-delete'); const nameInput = $('#tpl-name'); const msg = $('#tpl-msg');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const items = collectDaySlotsForTemplate(); if (items.length === 0) { if (msg) msg.textContent = 'この日に枠がありません。'; return; }
        const name = (nameInput?.value || '').trim() || 'テンプレ';
        const list = loadTemplates(); list.push({ name, items }); saveTemplates(list); refreshTemplateSelect(); if (msg) msg.textContent = 'テンプレートを保存しました。';
      });
    }
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        const sel = $('#tpl-select'); const idx = sel ? Number(sel.value) : NaN; const date = $('#selected-date')?.value;
        if (isNaN(idx)) { if (msg) msg.textContent = 'テンプレートを選択してください。'; return; }
        if (!date) { if (msg) msg.textContent = '適用する日付を選択してください。'; return; }
        const list = loadTemplates(); const tpl = list[idx]; if (!tpl) { if (msg) msg.textContent = 'テンプレートが見つかりません。'; return; }
        const { added } = applyTemplateToDate(tpl, date); renderSlotsList(); renderCalendar(); if (msg) msg.textContent = `${added}件の枠を追加しました。`;
      });
    }
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        const sel = $('#tpl-select'); const idx = sel ? Number(sel.value) : NaN; if (isNaN(idx)) { if (msg) msg.textContent = '削除するテンプレートを選択してください。'; return; }
        const list = loadTemplates(); if (idx < 0 || idx >= list.length) { if (msg) msg.textContent = 'テンプレートが見つかりません。'; return; }
        list.splice(idx, 1); saveTemplates(list); refreshTemplateSelect(); if (msg) msg.textContent = 'テンプレートを削除しました。';
      });
    }
    refreshTemplateSelect();

    // Auto export toggle
    try {
      const key = 'glowup:slots:autoExport';
      const cb = document.getElementById('slots-auto-export');
      if (cb instanceof HTMLInputElement) {
        const saved = localStorage.getItem(key);
        cb.checked = saved === null ? false : saved === '1';
        if (saved === null) localStorage.setItem(key, '0');
        cb.addEventListener('change', () => localStorage.setItem(key, cb.checked ? '1' : '0'));
      }
    } catch {}

    renderServiceOptions(); renderCalendar();
    const sd = $('#selected-date'); if (sd) sd.value = new Date().toISOString().slice(0, 10);
    renderSlotsList();

    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  return (
    <main className="section">
      <div className="container stack">
        <h1 className="section-title">予約枠・スケジュール管理</h1>
        <div className="cluster" style={{ justifyContent: 'flex-end', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="cluster" style={{ gap: '8px', flexWrap: 'wrap' }}>
            <label htmlFor="slots-import-input" className="btn btn-ghost" style={{ margin: 0 }}>インポート</label>
            <input id="slots-import-input" type="file" accept="application/json" style={{ display: 'none' }} />
          </div>
          <label className="cluster" style={{ alignItems: 'center', gap: '8px' }}>
            <input id="slots-auto-export" type="checkbox" />
            <span className="muted">保存時に自動バックアップ（ダウンロード）</span>
          </label>
        </div>
        <p className="muted">このページで予約可能枠を管理できます（ブラウザ内保存・デモ）。</p>

        <div className="grid" style={{ gap: '24px', alignItems: 'start' }}>
          <section className="card col-6" style={{ padding: '16px' }}>
            <header className="cluster" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="cluster" style={{ gap: '8px' }}>
                <button className="btn btn-ghost" id="prev-month">◀</button>
                <h3 id="cal-title" style={{ margin: 0, fontSize: '16px' }}>読み込み中...</h3>
                <button className="btn btn-ghost" id="next-month">▶</button>
              </div>
              <div className="cluster" style={{ gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="cluster" role="group" aria-label="表示切替" style={{ gap: '4px' }}>
                  <button id="view-month" className="btn btn-ghost" type="button" aria-pressed="true">月</button>
                  <button id="view-week" className="btn btn-ghost" type="button" aria-pressed="false">週</button>
                  <button id="view-day" className="btn btn-ghost" type="button" aria-pressed="false">日</button>
                </div>
                <button className="btn btn-ghost" id="today-btn">今日</button>
              </div>
            </header>
            <div id="calendar" className="calendar"></div>
          </section>

          <section className="card col-6 stack" style={{ padding: '16px', gap: '16px' }}>
            <div className="stack" style={{ gap: '8px' }}>
              <label className="muted">対象サービス</label>
              <select id="service-select"></select>
            </div>
            <div className="stack" style={{ gap: '8px' }}>
              <label className="muted">選択日</label>
              <input id="selected-date" type="date" />
            </div>
            <div className="stack" style={{ gap: '8px' }}>
              <label className="muted">この日の枠</label>
              <div id="slots-list" className="stack"></div>
            </div>
            <div className="stack" style={{ gap: '8px' }}>
              <label className="muted">枠を追加</label>
              <div className="cluster" style={{ gap: '8px', alignItems: 'end', flexWrap: 'wrap' }}>
                <div className="stack"><label className="muted" htmlFor="slot-start">開始</label><input id="slot-start" type="time" /></div>
                <div className="stack"><label className="muted" htmlFor="slot-end">終了</label><input id="slot-end" type="time" /></div>
                <div className="stack"><label className="muted" htmlFor="slot-cap">定員</label><input id="slot-cap" type="number" min="1" defaultValue="1" style={{ width: '100px' }} /></div>
                <button className="btn" id="add-slot">追加</button>
              </div>
              <p className="muted" id="slot-msg"></p>
            </div>
            <details>
              <summary>一括生成（平日/土日）</summary>
              <div className="stack" style={{ gap: '8px', marginTop: '8px' }}>
                <div className="cluster" style={{ gap: '8px', flexWrap: 'wrap' }}>
                  <div className="stack"><label className="muted" htmlFor="bulk-from">開始日</label><input id="bulk-from" type="date" /></div>
                  <div className="stack"><label className="muted" htmlFor="bulk-to">終了日</label><input id="bulk-to" type="date" /></div>
                  <div className="stack">
                    <label className="muted" htmlFor="bulk-days">対象</label>
                    <select id="bulk-days">
                      <option value="weekdays">平日のみ</option>
                      <option value="weekends">土日のみ</option>
                      <option value="all">全日</option>
                    </select>
                  </div>
                </div>
                <div className="cluster" style={{ gap: '8px', flexWrap: 'wrap', alignItems: 'end' }}>
                  <div className="stack"><label className="muted" htmlFor="bulk-start">開始</label><input id="bulk-start" type="time" defaultValue="10:00" /></div>
                  <div className="stack"><label className="muted" htmlFor="bulk-end">終了</label><input id="bulk-end" type="time" defaultValue="19:00" /></div>
                  <div className="stack"><label className="muted" htmlFor="bulk-interval">間隔(分)</label><input id="bulk-interval" type="number" min="15" step="15" defaultValue="60" style={{ width: '110px' }} /></div>
                  <div className="stack"><label className="muted" htmlFor="bulk-cap">定員</label><input id="bulk-cap" type="number" min="1" defaultValue="1" style={{ width: '100px' }} /></div>
                  <button className="btn" id="bulk-generate">一括生成</button>
                </div>
                <p className="muted" id="bulk-msg"></p>
              </div>
            </details>
            <details>
              <summary>テンプレート（保存/適用/削除）</summary>
              <div className="stack" style={{ gap: '8px', marginTop: '8px' }}>
                <div className="cluster" style={{ gap: '8px', flexWrap: 'wrap', alignItems: 'end' }}>
                  <div className="stack"><label className="muted">テンプレ名</label><input id="tpl-name" type="text" placeholder="例）平日 10-19:00 60分" /></div>
                  <button className="btn" id="tpl-save">この日の枠を保存</button>
                </div>
                <div className="cluster" style={{ gap: '8px', flexWrap: 'wrap', alignItems: 'end' }}>
                  <div className="stack"><label className="muted">テンプレ選択</label><select id="tpl-select"></select></div>
                  <button className="btn" id="tpl-apply">選択日に適用</button>
                  <button className="btn btn-ghost" id="tpl-delete">削除</button>
                  <span className="muted" id="tpl-msg"></span>
                </div>
              </div>
            </details>
          </section>
        </div>
      </div>
    </main>
  );
}
