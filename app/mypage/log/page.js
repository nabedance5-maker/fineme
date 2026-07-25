'use client';
import useTrack from '@/app/_hooks/useTrack';
import { useEffect, useRef } from 'react';
import Link from 'next/link';

const AXIS_DEFS = {
  body:        { icon: '💪', label: '体型・ジム',     freq: { min: 1,  max: 1,  unit: '週' } },
  eyebrow:     { icon: '✂️', label: '眉',             freq: { min: 3,  max: 6,  unit: '週' } },
  hair:        { icon: '💇', label: '髪・美容室',     freq: { min: 4,  max: 8,  unit: '週' } },
  skin:        { icon: '✨', label: '肌ケア・エステ', freq: { min: 2,  max: 4,  unit: '週' } },
  hairremoval: { icon: '🪒', label: '脱毛',           freq: { min: 4,  max: 8,  unit: '週' } },
  teeth:       { icon: '🦷', label: '歯・ホワイトニング', freq: { min: 2, max: 4, unit: '週' } },
  nail:        { icon: '💅', label: '爪',             freq: { min: 3,  max: 4,  unit: '週' } },
  fashion:     { icon: '👔', label: '服・ファッション', freq: null },
};

// 前回日 + 頻度(週) → 推奨次回日
function calcIdealNext(lastVisit, freqWeeks) {
  if (!lastVisit || !freqWeeks) return null;
  const d = new Date(lastVisit);
  d.setDate(d.getDate() + freqWeeks * 7);
  return d.toISOString().slice(0, 10);
}

// 日付 → 「〇日後」「今日」「〇日前」
function daysFromToday(dateStr) {
  if (!dateStr) return null;
  const diff = Math.round((new Date(dateStr) - new Date()) / 86400000);
  if (diff === 0) return '今日';
  if (diff > 0) return `${diff}日後`;
  return `${-diff}日前`;
}

export default function NewMeLogPage() {
  const { track } = useTrack();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      .log-wrap { max-width: 100%; padding: 0 0 100px; }

      /* ── Header ── */
      .log-header { background: linear-gradient(rgba(10,15,30,0.82), rgba(10,15,30,0.92)), url('/assets/images/hero-bg.webp') center/cover no-repeat; border-radius: 14px; padding: 22px 22px 18px; margin-bottom: 24px; border: 1px solid rgba(201,168,76,0.2); position: relative; overflow: hidden; }
      .log-header-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: .18em; color: rgba(201,168,76,0.55); margin: 0 0 8px; text-transform: uppercase; }
      .log-header h1 { font-family: 'Noto Serif JP', Georgia, serif; font-size: clamp(18px,4vw,24px); font-weight: 700; color: #fff; margin: 0 0 6px; }
      .log-header h1 em { font-style: normal; color: #c9a84c; }
      .log-header-sub { font-size: 12px; color: rgba(232,228,220,0.45); margin: 0; line-height: 1.6; }

      /* ── Add button ── */
      .log-add-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; background: rgba(201,168,76,0.08); border: 1.5px dashed rgba(201,168,76,0.4); border-radius: 12px; color: #c9a84c; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .15s; margin-bottom: 24px; }
      .log-add-btn:hover { background: rgba(201,168,76,0.14); border-color: #c9a84c; }

      /* ── Service card ── */
      .log-axis-section { margin-bottom: 24px; }
      .log-axis-label { font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: rgba(201,168,76,0.6); margin: 0 0 10px; display: flex; align-items: center; gap: 8px; }
      .log-axis-label::after { content: ''; flex: 1; height: 1px; background: rgba(201,168,76,0.15); }
      .log-card { background: rgba(10,15,30,0.65); border: 1px solid rgba(232,228,220,0.12); border-radius: 14px; padding: 16px 18px; backdrop-filter: blur(8px); box-shadow: 0 4px 20px rgba(0,0,0,.35); transition: border-color .2s; }
      .log-card:not(:last-child) { margin-bottom: 10px; }
      .log-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
      .log-card-name { font-size: 16px; font-weight: 800; color: rgba(232,228,220,0.92); margin: 0 0 4px; }
      .log-card-provider-link { font-size: 11px; color: rgba(201,168,76,0.7); text-decoration: none; display: inline-flex; align-items: center; gap: 3px; }
      .log-card-provider-link:hover { color: #c9a84c; text-decoration: underline; }
      .log-card-actions { display: flex; gap: 6px; flex-shrink: 0; }
      .log-card-edit-btn, .log-card-del-btn { font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 7px; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: all .12s; border: 1px solid; }
      .log-card-edit-btn { color: rgba(232,228,220,0.6); border-color: rgba(232,228,220,0.15); background: transparent; }
      .log-card-edit-btn:hover { border-color: #c9a84c; color: #c9a84c; }
      .log-card-del-btn { color: rgba(239,68,68,0.6); border-color: rgba(239,68,68,0.15); background: transparent; }
      .log-card-del-btn:hover { border-color: #ef4444; color: #ef4444; }
      .log-card-schedule { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
      .log-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 99px; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.12); color: rgba(232,228,220,0.65); white-space: nowrap; }
      .log-chip.chip-next-soon { border-color: rgba(52,211,153,0.4); color: rgba(52,211,153,0.9); background: rgba(52,211,153,0.06); }
      .log-chip.chip-next-today { border-color: #c9a84c; color: #c9a84c; background: rgba(201,168,76,0.08); }
      .log-chip.chip-next-overdue { border-color: rgba(239,68,68,0.4); color: rgba(239,68,68,0.8); background: rgba(239,68,68,0.06); }
      .log-card-memo { font-size: 11px; color: rgba(232,228,220,0.38); margin: 8px 0 0; line-height: 1.55; }
      .log-card-ideal { font-size: 10px; color: rgba(201,168,76,0.5); margin: 6px 0 0; }

      /* ── Empty state ── */
      .log-empty { text-align: center; padding: 48px 20px; color: rgba(232,228,220,0.35); }
      .log-empty-icon { font-size: 40px; margin-bottom: 12px; }
      .log-empty-text { font-size: 13px; line-height: 1.7; }

      /* ── Modal overlay ── */
      .log-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.72); z-index: 999; display: flex; align-items: flex-end; justify-content: center; padding-bottom: env(safe-area-inset-bottom); }
      .log-modal-overlay.hidden { display: none; }
      .log-modal { background: #0e1528; border-radius: 20px 20px 0 0; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; padding: 24px 20px 40px; }
      .log-modal-title { font-size: 16px; font-weight: 800; color: rgba(232,228,220,0.9); margin: 0 0 20px; }
      .log-field { margin-bottom: 16px; }
      .log-field label { display: block; font-size: 11px; font-weight: 700; color: rgba(201,168,76,0.7); letter-spacing: .08em; margin-bottom: 6px; text-transform: uppercase; }
      .log-field input, .log-field select, .log-field textarea { width: 100%; background: rgba(10,15,30,0.6); border: 1px solid rgba(232,228,220,0.15); border-radius: 9px; padding: 11px 13px; font-size: 14px; color: rgba(232,228,220,0.88); font-family: 'Noto Sans JP', sans-serif; outline: none; box-sizing: border-box; transition: border-color .15s; }
      .log-field input:focus, .log-field select:focus, .log-field textarea:focus { border-color: rgba(201,168,76,0.5); }
      .log-field textarea { resize: vertical; min-height: 64px; }
      .log-field select option { background: #0e1528; }
      .log-field-hint { font-size: 10px; color: rgba(232,228,220,0.3); margin: 4px 0 0; line-height: 1.5; }
      .log-modal-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .log-provider-search { display: flex; gap: 8px; align-items: center; }
      .log-provider-search input { flex: 1; }
      .log-provider-clear { font-size: 11px; color: rgba(239,68,68,0.7); background: none; border: none; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; padding: 0; white-space: nowrap; }
      .log-provider-result { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
      .log-provider-item { padding: 8px 12px; background: rgba(10,15,30,0.5); border: 1px solid rgba(232,228,220,0.1); border-radius: 8px; cursor: pointer; font-size: 12px; color: rgba(232,228,220,0.75); transition: all .12s; }
      .log-provider-item:hover, .log-provider-item.selected { border-color: rgba(201,168,76,0.4); color: #c9a84c; background: rgba(201,168,76,0.06); }
      .log-modal-btns { display: flex; gap: 10px; margin-top: 24px; }
      .log-modal-save { flex: 1; padding: 14px; background: #c9a84c; border: none; border-radius: 11px; font-size: 15px; font-weight: 800; color: #0a0f1e; cursor: pointer; font-family: 'Noto Sans JP', sans-serif; transition: opacity .15s; }
      .log-modal-save:hover { opacity: .88; }
      .log-modal-cancel { padding: 14px 20px; background: transparent; border: 1px solid rgba(232,228,220,0.15); border-radius: 11px; font-size: 14px; font-weight: 700; color: rgba(232,228,220,0.5); cursor: pointer; font-family: 'Noto Sans JP', sans-serif; }
    `;
    document.head.appendChild(style);

    const root = document.getElementById('log-root');
    if (!root) return;

    let token = null;
    try {
      const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
      if (sbKey) {
        const obj = JSON.parse(localStorage.getItem(sbKey));
        if (obj?.access_token) token = obj.access_token;
      }
    } catch {}

    if (!token) {
      root.innerHTML = `<div class="log-empty"><div class="log-empty-icon">🔒</div><p class="log-empty-text">ログインが必要です。<br><a href="/mypage" style="color:#c9a84c">マイページへ</a></p></div>`;
      return;
    }

    let logs = [];
    let editingId = null;
    let providerSearchResults = [];
    let selectedProvider = null;

    // ── データ取得 ──
    async function fetchLogs() {
      try {
        const r = await fetch('/api/me/service-logs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const d = await r.json();
        logs = d.logs || [];
      } catch { logs = []; }
    }

    // ── Finemeプロバイダー検索 ──
    async function searchProviders(q) {
      if (!q.trim()) { providerSearchResults = []; renderProviderResults(); return; }
      try {
        const r = await fetch(`/api/providers?q=${encodeURIComponent(q)}&limit=5`);
        const d = await r.json();
        providerSearchResults = (d.providers || []).slice(0, 5);
      } catch { providerSearchResults = []; }
      renderProviderResults();
    }

    function renderProviderResults() {
      const el = document.getElementById('log-provider-results');
      if (!el) return;
      if (!providerSearchResults.length) { el.innerHTML = ''; return; }
      el.innerHTML = providerSearchResults.map(p => {
        const isSelected = selectedProvider?.id === p.id;
        return `<div class="log-provider-item${isSelected ? ' selected' : ''}" data-slug="${p.slug}" data-type="${p.entity_type || 'provider'}" data-name="${encodeURIComponent(p.name || '')}">${p.entity_type === 'affiliate' ? '🔗 ' : '🏥 '}${p.name}</div>`;
      }).join('');
    }

    // ── チップ色クラス ──
    function nextChipClass(dateStr) {
      if (!dateStr) return '';
      const diff = Math.round((new Date(dateStr) - new Date()) / 86400000);
      if (diff < 0)  return 'chip-next-overdue';
      if (diff === 0) return 'chip-next-today';
      if (diff <= 7) return 'chip-next-soon';
      return '';
    }

    // ── メインレンダリング ──
    function render() {
      if (!logs.length) {
        root.innerHTML = `
          <div class="log-header">
            <p class="log-header-eyebrow">New Me Log</p>
            <h1><em>変容の旅の記録帳</em></h1>
            <p class="log-header-sub">通っているサービスを登録して、変容の旅を一元管理しよう。</p>
          </div>
          <button class="log-add-btn" id="log-open-add">＋ サービスを登録する</button>
          <div class="log-empty">
            <div class="log-empty-icon">📖</div>
            <p class="log-empty-text">まだサービスが登録されていません。<br>ジム・美容室・エステ・サロンなど、<br>定期的に通っているものを追加しよう。</p>
          </div>`;
        bindEvents();
        return;
      }

      // 軸ごとにグループ化
      const grouped = {};
      logs.forEach(log => {
        if (!grouped[log.axis]) grouped[log.axis] = [];
        grouped[log.axis].push(log);
      });

      const sectionsHtml = Object.entries(AXIS_DEFS)
        .filter(([id]) => grouped[id])
        .map(([id, def]) => {
          const cards = grouped[id].map(log => {
            const nextDays = daysFromToday(log.next_visit);
            const chipClass = nextChipClass(log.next_visit);
            const providerHref = log.provider_slug
              ? (log.provider_type === 'affiliate' ? `/affiliate/${log.provider_slug}` : `/provider/${log.provider_slug}`)
              : null;
            const idealFreqText = def.freq
              ? `理想：${def.freq.min === def.freq.max ? def.freq.min : `${def.freq.min}〜${def.freq.max}`}${def.freq.unit}ごと`
              : '';
            return `
              <div class="log-card" data-id="${log.id}">
                <div class="log-card-top">
                  <div>
                    <p class="log-card-name">${esc(log.name)}</p>
                    ${providerHref ? `<a class="log-card-provider-link" href="${providerHref}">🔗 Finemeに掲載中</a>` : ''}
                  </div>
                  <div class="log-card-actions">
                    <button class="log-card-edit-btn" data-edit="${log.id}">編集</button>
                    <button class="log-card-del-btn" data-del="${log.id}">削除</button>
                  </div>
                </div>
                <div class="log-card-schedule">
                  ${log.last_visit ? `<span class="log-chip">前回 ${log.last_visit}</span>` : ''}
                  ${log.next_visit ? `<span class="log-chip ${chipClass}">次回 ${log.next_visit}${nextDays ? `（${nextDays}）` : ''}</span>` : '<span class="log-chip" style="opacity:.45">次回未設定</span>'}
                  ${log.frequency_weeks ? `<span class="log-chip">🔄 ${log.frequency_weeks}週ごと</span>` : ''}
                </div>
                ${log.memo ? `<p class="log-card-memo">📝 ${esc(log.memo)}</p>` : ''}
                ${idealFreqText && log.frequency_weeks ? '' : idealFreqText ? `<p class="log-card-ideal">💡 ${idealFreqText}</p>` : ''}
              </div>`;
          }).join('');
          return `<div class="log-axis-section">
            <p class="log-axis-label">${def.icon} ${def.label}</p>
            ${cards}
          </div>`;
        }).join('');

      root.innerHTML = `
        <div class="log-header">
          <p class="log-header-eyebrow">New Me Log</p>
          <h1><em>変容の旅の記録帳</em></h1>
          <p class="log-header-sub">通っているサービスを一元管理。次回の予約を忘れない。</p>
        </div>
        <button class="log-add-btn" id="log-open-add">＋ サービスを追加する</button>
        ${sectionsHtml}`;
      bindEvents();
    }

    // ── モーダル表示 ──
    function openModal(log = null) {
      editingId = log?.id || null;
      selectedProvider = log?.provider_slug ? { slug: log.provider_slug, type: log.provider_type } : null;

      const axisOptions = Object.entries(AXIS_DEFS).map(([id, def]) =>
        `<option value="${id}"${log?.axis === id ? ' selected' : ''}>${def.icon} ${def.label}</option>`
      ).join('');

      const overlay = document.getElementById('log-modal-overlay');
      const title = document.getElementById('log-modal-title');
      title.textContent = log ? 'サービスを編集' : '新しいサービスを登録';

      document.getElementById('log-f-axis').innerHTML = axisOptions;
      document.getElementById('log-f-name').value         = log?.name || '';
      document.getElementById('log-f-freq').value         = log?.frequency_weeks || '';
      document.getElementById('log-f-last').value         = log?.last_visit || '';
      document.getElementById('log-f-next').value         = log?.next_visit || '';
      document.getElementById('log-f-memo').value         = log?.memo || '';
      document.getElementById('log-provider-search-input').value = log?.provider_slug ? `（登録済み）${log.provider_slug}` : '';
      providerSearchResults = [];
      renderProviderResults();
      overlay.classList.remove('hidden');

      // 軸変更で理想頻度ヒントを更新
      updateFreqHint();
    }

    function closeModal() {
      document.getElementById('log-modal-overlay').classList.add('hidden');
      editingId = null;
      selectedProvider = null;
    }

    function updateFreqHint() {
      const axisId = document.getElementById('log-f-axis')?.value;
      const hint = document.getElementById('log-freq-hint');
      if (!hint) return;
      const def = AXIS_DEFS[axisId];
      if (def?.freq) {
        const r = def.freq.min === def.freq.max ? `${def.freq.min}` : `${def.freq.min}〜${def.freq.max}`;
        hint.textContent = `${def.label} の推奨頻度：${r}${def.freq.unit}ごと`;
      } else {
        hint.textContent = '';
      }
    }

    // 前回日 → 次回日を自動計算してセット
    function autoFillNext() {
      const last = document.getElementById('log-f-last')?.value;
      const freq = parseInt(document.getElementById('log-f-freq')?.value);
      const nextInput = document.getElementById('log-f-next');
      if (last && freq && nextInput && !nextInput.value) {
        nextInput.value = calcIdealNext(last, freq) || '';
      }
    }

    // ── 保存 ──
    async function saveLog() {
      const axis           = document.getElementById('log-f-axis').value;
      const name           = document.getElementById('log-f-name').value.trim();
      const frequency_weeks = parseInt(document.getElementById('log-f-freq').value) || null;
      const last_visit     = document.getElementById('log-f-last').value || null;
      const next_visit     = document.getElementById('log-f-next').value || null;
      const memo           = document.getElementById('log-f-memo').value.trim() || null;

      if (!name) { alert('サービス名を入力してください'); return; }

      const body = {
        axis, name, frequency_weeks, last_visit, next_visit, memo,
        provider_slug: selectedProvider?.slug || null,
        provider_type: selectedProvider?.type || null,
      };

      const saveBtn = document.getElementById('log-modal-save');
      saveBtn.disabled = true; saveBtn.textContent = '保存中...';

      try {
        const url    = editingId ? `/api/me/service-logs/${editingId}` : '/api/me/service-logs';
        const method = editingId ? 'PUT' : 'POST';
        const r = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error((await r.json()).error || 'error');
        await fetchLogs();
        closeModal();
        render();
      } catch (e) {
        alert('保存に失敗しました: ' + e.message);
      } finally {
        saveBtn.disabled = false; saveBtn.textContent = '保存する';
      }
    }

    // ── 削除 ──
    async function deleteLog(id) {
      if (!confirm('このサービスを削除しますか？')) return;
      await fetch(`/api/me/service-logs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchLogs();
      render();
    }

    function esc(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── イベントバインド ──
    function bindEvents() {
      document.getElementById('log-open-add')?.addEventListener('click', () => openModal());
      root.addEventListener('click', e => {
        const editBtn = e.target.closest('[data-edit]');
        if (editBtn) { const id = editBtn.dataset.edit; openModal(logs.find(l => l.id === id)); return; }
        const delBtn = e.target.closest('[data-del]');
        if (delBtn) { deleteLog(delBtn.dataset.del); return; }
      });
    }

    // ── モーダルイベント ──
    document.getElementById('log-modal-save')?.addEventListener('click', saveLog);
    document.getElementById('log-modal-cancel')?.addEventListener('click', closeModal);
    document.getElementById('log-modal-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.getElementById('log-f-axis')?.addEventListener('change', updateFreqHint);
    document.getElementById('log-f-last')?.addEventListener('change', autoFillNext);
    document.getElementById('log-f-freq')?.addEventListener('change', autoFillNext);

    let searchTimer;
    document.getElementById('log-provider-search-input')?.addEventListener('input', e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => searchProviders(e.target.value), 350);
    });
    document.getElementById('log-provider-results')?.addEventListener('click', e => {
      const item = e.target.closest('.log-provider-item');
      if (!item) return;
      selectedProvider = { slug: item.dataset.slug, type: item.dataset.type };
      document.getElementById('log-provider-search-input').value = decodeURIComponent(item.dataset.name);
      providerSearchResults = [];
      renderProviderResults();
    });
    document.getElementById('log-provider-clear')?.addEventListener('click', () => {
      selectedProvider = null;
      document.getElementById('log-provider-search-input').value = '';
      providerSearchResults = [];
      renderProviderResults();
    });

    // ── 初期ロード ──
    root.innerHTML = `<div style="text-align:center;padding:60px 0;color:rgba(232,228,220,0.3);font-size:13px">読み込み中...</div>`;
    fetchLogs().then(() => render());
  }, []);

  return (
    <main className="section">
      <div className="container mypage-layout">
        <aside className="mypage-sidenav">
          <nav className="stack" style={{ gap: '4px' }}>
            <Link href="/mypage" className="sidenav-link">ホーム</Link>
            <Link href={track.diagnosisResult} className="sidenav-link">New Me Navi</Link>
            <Link href="/mypage/navi" className="sidenav-link">New Me Map</Link>
            <Link href="/mypage/log" className="sidenav-link sidenav-link--active">New Me Log</Link>
            <Link href="/mypage/mirror" className="sidenav-link">Mirror履歴</Link>
            <Link href="/mypage/subscription" className="sidenav-link">サブスク設定</Link>
            <Link href="/mypage/favorites" className="sidenav-link">お気に入り</Link>
            <Link href="/mypage/history" className="sidenav-link">閲覧履歴</Link>
            <Link href="/my-reservations" className="sidenav-link">予約履歴</Link>
            <Link href="/mypage/story-submit" className="sidenav-link">体験談を書く</Link>
            <Link href="/mypage/profile" className="sidenav-link">プロフィール編集</Link>
          </nav>
        </aside>

        <section>
          <div id="log-root" className="log-wrap" />

          {/* モーダル（常にDOM上に存在） */}
          <div id="log-modal-overlay" className="log-modal-overlay hidden">
            <div id="log-modal" className="log-modal">
              <p id="log-modal-title" className="log-modal-title">サービスを登録</p>

              <div className="log-field">
                <label>軸（カテゴリ）</label>
                <select id="log-f-axis" />
              </div>

              <div className="log-field">
                <label>サービス名</label>
                <input id="log-f-name" type="text" placeholder="例：〇〇パーソナルジム、△△美容室" />
              </div>

              <div className="log-field">
                <label>Finemeサービスと紐づける（任意）</label>
                <div className="log-provider-search">
                  <input id="log-provider-search-input" type="text" placeholder="サービス名で検索..." />
                  <button className="log-provider-clear" id="log-provider-clear">解除</button>
                </div>
                <div id="log-provider-results" className="log-provider-result" />
              </div>

              <div className="log-modal-row">
                <div className="log-field">
                  <label>頻度（週ごと）</label>
                  <input id="log-f-freq" type="number" placeholder="例：4（4週ごと）" min="1" max="52" />
                  <p id="log-freq-hint" className="log-field-hint" />
                </div>
                <div className="log-field">
                  <label>前回利用日</label>
                  <input id="log-f-last" type="date" />
                </div>
              </div>

              <div className="log-field">
                <label>次回予約日</label>
                <input id="log-f-next" type="date" />
                <p className="log-field-hint">前回日と頻度を入力すると自動で候補が入ります</p>
              </div>

              <div className="log-field">
                <label>メモ（任意）</label>
                <textarea id="log-f-memo" placeholder="担当者名、店舗の場所など..." />
              </div>

              <div className="log-modal-btns">
                <button className="log-modal-cancel" id="log-modal-cancel">キャンセル</button>
                <button className="log-modal-save" id="log-modal-save">保存する</button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .mypage-layout { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        .mypage-sidenav { background: rgba(10,15,30,0.65); backdrop-filter: blur(8px); border: 1px solid rgba(201,168,76,0.28); border-radius: 14px; padding: 12px; position: sticky; top: 80px; }
        @media (max-width: 640px) { .mypage-layout { grid-template-columns: 1fr; } .mypage-sidenav { position: static; padding: 8px; border-radius: 12px; margin-bottom: 8px; overflow: hidden; } .mypage-sidenav nav { display: flex; flex-direction: row; overflow-x: auto; gap: 4px; scrollbar-width: none; } .mypage-sidenav nav::-webkit-scrollbar { display: none; } .mypage-sidenav nav > * { margin-top: 0 !important; } .sidenav-link { white-space: nowrap; padding: 6px 14px; font-size: 13px; flex-shrink: 0; } }
        .sidenav-link { display: block; padding: 8px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: rgba(232,228,220,0.75); text-decoration: none; transition: background .15s; }
        .sidenav-link:hover { background: rgba(201,168,76,0.1); color: #0a0f1e; }
        .sidenav-link--active { background: rgba(201,168,76,0.14); font-weight: 700; color: #0a0f1e; border-left: 3px solid #c9a84c; padding-left: 9px; }
      `}</style>
    </main>
  );
}
