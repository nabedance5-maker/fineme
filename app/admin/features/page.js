'use client';
import { useEffect, useRef } from 'react';

export default function AdminFeaturesPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
      #feature-modal .modal-content .rte-toolbar{position:sticky !important; top:0 !important; z-index:10; background:#fff; display:flex; flex-wrap:wrap; gap:8px}
      body.modal-open{ overflow:hidden; }
      .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(2px);display:block;z-index:999}
      .modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;z-index:1000}
      .modal[hidden], .modal-backdrop[hidden]{display:none}
      #feature-modal-backdrop{opacity:0;transition:opacity .2s ease}
      #feature-modal-backdrop.is-open{opacity:1}
      #feature-modal .modal-content{position:relative;opacity:0;transform:translateY(8px) scale(.98);transition:opacity .2s ease, transform .2s ease;width:min(100%,960px);max-height:min(90vh,820px);overflow:auto}
      #feature-modal.is-open .modal-content{opacity:1;transform:none}
      .rte-toolbar{position:sticky; top:0; z-index:2; background:#fff; border-bottom:1px solid var(--color-border); display:flex; flex-wrap:wrap; gap:8px}
      .rte-editor{min-height:320px}
      .rte-sep{display:inline-block;width:1px;height:20px;background:var(--color-border,#e5e7eb);margin:0 4px;align-self:center}
      .rte-btn{padding:4px 8px;border:1px solid var(--color-border,#e5e7eb);border-radius:4px;background:#fff;cursor:pointer;font-size:13px}
      .rte-btn.is-active{background:#111;color:#fff}
    `;
    document.head.appendChild(style);

    // ── Admin key ──────────────────────────────────────
    let ADMIN_KEY = sessionStorage.getItem('fineme:admin:key') || '';
    if (!ADMIN_KEY) {
      ADMIN_KEY = prompt('管理APIキーを入力してください：') || '';
      if (ADMIN_KEY) sessionStorage.setItem('fineme:admin:key', ADMIN_KEY);
    }
    function h() { return { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY }; }

    // ── In-memory cache ────────────────────────────────
    let _cache = [];

    async function refreshFeatures() {
      try {
        const res = await fetch('/api/admin/features', { headers: h() });
        if (!res.ok) { showMsg(`API error: ${res.status}`); return; }
        _cache = await res.json();
        renderTable();
      } catch (e) { showMsg(`読み込みエラー: ${e.message}`); }
    }

    function loadFeatures() { return _cache; }

    function showMsg(text) {
      try {
        const msg = document.getElementById('feature-message');
        if (msg) msg.textContent = text;
      } catch {}
    }

    // ── saveFeatures は廃止（API経由のみ）──────────────
    function saveFeatures(list) {
      // no-op: 後方互換のために残す
      try {
        const cb = document.getElementById('features-auto-export');
        if (cb && cb instanceof HTMLInputElement && cb.checked) {
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `features-backup-${ts}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        }
      } catch {}
    }

    function sanitizeHtml(html) {
      const allowedTags = new Set(['P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'U', 'A', 'BLOCKQUOTE', 'IMG', 'BR', 'DIV', 'SECTION', 'FIGURE', 'SPAN']);
      const allowedAttrs = {
        'A': ['href', 'target', 'rel', 'class'],
        'IMG': ['src', 'alt', 'data-size', 'class', 'data-x', 'data-y', 'data-w', 'data-h'],
        'P': ['data-align', 'class'], 'H2': ['data-align', 'class'], 'H3': ['data-align', 'class'], 'H4': ['data-align', 'class'],
        'LI': ['data-align', 'class'], 'UL': ['data-align', 'class'], 'OL': ['data-align', 'class'], 'BLOCKQUOTE': ['data-align', 'class'],
        'DIV': ['data-align', 'class', 'data-x', 'data-y', 'data-w', 'data-h'],
        'SECTION': ['class', 'data-x', 'data-y', 'data-w', 'data-h'],
        'FIGURE': ['class', 'data-x', 'data-y', 'data-w', 'data-h'],
        'SPAN': ['class']
      };
      const tmp = document.createElement('div');
      tmp.innerHTML = html || '';
      const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_ELEMENT, null);
      const toRemove = [];
      while (walker.nextNode()) {
        const el = walker.currentNode;
        if (!allowedTags.has(el.tagName)) { toRemove.push(el); continue; }
        for (const attr of Array.from(el.attributes)) {
          const ok = allowedAttrs[el.tagName] && allowedAttrs[el.tagName].includes(attr.name.toLowerCase());
          if (!ok) { el.removeAttribute(attr.name); }
        }
        if (el.tagName === 'A') {
          const href = el.getAttribute('href') || '';
          if (href && !/^https?:\/\//i.test(href) && !href.startsWith('#')) { el.removeAttribute('href'); }
          el.setAttribute('rel', 'noopener'); el.setAttribute('target', '_blank');
        }
      }
      for (const el of toRemove) { const parent = el.parentNode; while (el.firstChild) { parent.insertBefore(el.firstChild, el); } parent.removeChild(el); }
      return tmp.innerHTML;
    }

    function labelStatus(s) {
      switch (s) { case 'published': return '公開'; case 'private': return '非公開'; default: return '下書き'; }
    }

    function formatDate(iso) { try { return new Date(iso).toLocaleString(); } catch { return ''; } }

    function updateThumbPreview(url) {
      try {
        const img = document.getElementById('feature-thumbnail-preview');
        if (!img) return;
        if (url && (/^https?:\/\//i.test(url) || /^data:image\//i.test(url))) { img.src = url; img.style.display = ''; }
        else { img.removeAttribute('src'); img.style.display = 'none'; }
      } catch {}
    }

    function getParam(name) { try { return new URL(location.href).searchParams.get(name); } catch { return null; } }
    function updateUrlForEdit(id) { const url = new URL(location.href); url.searchParams.set('id', id); history.pushState({ id }, '', url); }

    function fillForm(f) {
      const fId = document.getElementById('feature-id'); if (fId) fId.value = f?.id || '';
      const fSlug = document.getElementById('feature-slug'); if (fSlug) fSlug.value = f?.slug || '';
      const fTitle = document.getElementById('feature-title'); if (fTitle) fTitle.value = f?.title || '';
      const fDesc = document.getElementById('feature-description'); if (fDesc) fDesc.value = f?.description || '';
      const fCat = document.getElementById('feature-category'); if (fCat) fCat.value = f?.category || '';
      const fRT = document.getElementById('feature-reading-time'); if (fRT) fRT.value = f?.reading_time || 5;
      const fSummary = document.getElementById('feature-summary'); if (fSummary) fSummary.value = f?.summary || '';
      const th = document.getElementById('feature-thumbnail'); if (th) { th.value = f?.thumbnail || ''; }
      updateThumbPreview(f?.thumbnail || '');
      // blocksがある場合はHTML変換して本文エディタに読み込む
      const html = (f?.blocks ? blocksToHtml(f.blocks) : null) || f?.body || '';
      const ed = document.getElementById('feature-body-editor');
      if (ed) {
        ed.innerHTML = '';
        requestAnimationFrame(() => {
          try { ed.innerHTML = sanitizeHtml(html); } catch { ed.textContent = html; }
          try { const ta = document.getElementById('feature-body'); if (ta) { ta.value = sanitizeHtml(ed.innerHTML); } updatePreview(); } catch {}
        });
      }
      try { const ta = document.getElementById('feature-body'); if (ta) { ta.value = sanitizeHtml(html); } } catch {}
      const fStatus = document.getElementById('feature-status'); if (fStatus) fStatus.value = f?.status || 'draft';
    }

    function readForm() {
      return {
        id: document.getElementById('feature-id')?.value || null,
        slug: (document.getElementById('feature-slug')?.value || '').trim(),
        title: (document.getElementById('feature-title')?.value || '').trim(),
        description: (document.getElementById('feature-description')?.value || '').trim(),
        category: (document.getElementById('feature-category')?.value || '').trim(),
        reading_time: Number(document.getElementById('feature-reading-time')?.value || 5),
        summary: (document.getElementById('feature-summary')?.value || '').toString(),
        thumbnail: (document.getElementById('feature-thumbnail')?.value || '').toString().trim(),
        body: (document.getElementById('feature-body')?.value || '').toString(),
        blocks: null, // 本文エディタで編集した場合はbodyとして保存、blocksはクリア
        status: document.getElementById('feature-status')?.value || 'draft'
      };
    }

    function autoSlug(title) {
      // 英数字のみでスラッグ生成、日本語はタイムスタンプで補完
      const base = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      return (base || 'article') + '-' + Date.now().toString(36);
    }

    function updatePreview() {
      try {
        const pv = document.getElementById('feature-preview');
        const ta = document.getElementById('feature-body');
        const ed = document.getElementById('feature-body-editor');
        if (!pv || !ta || !ed) return;
        pv.innerHTML = ta.value || sanitizeHtml(ed.innerHTML || '');
      } catch {}
    }

    // ── ブロックエディタ ───────────────────────────────────────────────────
    let _blocks = [];

    const BLOCK_TYPES = {
      lead:      { label: 'リード文',        color: '#0a0f1e' },
      h2:        { label: '見出し H2',       color: '#c9a84c' },
      h3:        { label: '小見出し H3',     color: '#9ca3af' },
      text:      { label: '本文テキスト',    color: '#374151' },
      tip:       { label: 'ポイント TIP',    color: '#059669' },
      callout:   { label: 'コールアウト',    color: '#7c3aed' },
      quote:     { label: '引用',            color: '#dc2626' },
      checklist: { label: 'チェックリスト', color: '#ea580c' },
      steps:     { label: 'ステップ',        color: '#2563eb' },
      cta:       { label: 'CTA ボタン',      color: '#c9a84c' },
    };

    function bEsc(s) {
      return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function serializeBlocks() {
      const ta = document.getElementById('feature-blocks-json');
      if (ta) ta.value = _blocks.length ? JSON.stringify(_blocks) : '';
    }

    function renderBlockCard(b, i) {
      const type = BLOCK_TYPES[b.type] || { label: b.type, color: '#9ca3af' };
      const isFirst = i === 0, isLast = i === _blocks.length - 1;
      let fields = '';
      const ta = (field, val, rows=4, ph='') => `<textarea data-field="${field}" rows="${rows}" placeholder="${ph}" style="width:100%;resize:vertical;font-size:14px;padding:8px;border:1px solid #e5e7eb;border-radius:6px;box-sizing:border-box">${bEsc(val)}</textarea>`;
      const inp = (field, val, ph='', fw='') => `<input type="text" data-field="${field}" placeholder="${ph}" value="${bEsc(val)}" style="width:100%;padding:6px 8px;margin-bottom:6px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;${fw?'font-weight:'+fw+';':''}box-sizing:border-box">`;
      switch (b.type) {
        case 'lead': case 'text': case 'callout': case 'quote':
          fields = ta('text', b.text||'', b.type==='lead'?3:4); break;
        case 'h2':
          fields = inp('text', b.text||'', '見出しテキスト', '800'); break;
        case 'h3':
          fields = inp('text', b.text||'', '小見出しテキスト', '700'); break;
        case 'tip':
          fields = inp('label', b.label||'', 'ラベル（例：POINT）') + ta('text', b.text||'', 3); break;
        case 'cta':
          fields = ta('text', b.text||'', 2, '説明文')
            + inp('buttonLabel', b.buttonLabel||'', 'ボタンラベル（例：Me Scanで診断する）')
            + inp('buttonHref', b.buttonHref||'', 'リンク先（例：/diagnosis）'); break;
        case 'checklist': {
          const items = (b.items||[]).map((item,j)=>`
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
              <input type="text" data-cl-item="${j}" value="${bEsc(item)}" style="flex:1;padding:5px 8px;border:1px solid #e5e7eb;border-radius:5px;font-size:13px">
              <button type="button" data-cl-del="${j}" style="padding:2px 8px;background:#fee2e2;border:1px solid #fca5a5;border-radius:4px;cursor:pointer;font-size:12px;color:#dc2626">✕</button>
            </div>`).join('');
          fields = inp('title', b.title||'', 'リストのタイトル（任意）', '700')
            + `<div data-cl-list>${items}</div>`
            + `<button type="button" data-cl-add style="margin-top:4px;padding:5px 12px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;cursor:pointer;font-size:12px;color:#15803d">＋ 項目を追加</button>`;
          break;
        }
        case 'steps': {
          const items = (b.items||[]).map((item,j)=>{
            const t = typeof item==='object'?item.title||'':item;
            const tx = typeof item==='object'?item.text||'':'';
            return `<div data-step-item="${j}" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px;margin-bottom:6px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span style="font-size:11px;font-weight:700;color:#6b7280">STEP ${j+1}</span>
                <button type="button" data-step-del="${j}" style="padding:2px 8px;background:#fee2e2;border:1px solid #fca5a5;border-radius:4px;cursor:pointer;font-size:11px;color:#dc2626">削除</button>
              </div>
              <input type="text" data-step-title="${j}" placeholder="タイトル" value="${bEsc(t)}" style="width:100%;padding:5px 8px;margin-bottom:4px;border:1px solid #e5e7eb;border-radius:5px;font-size:13px;font-weight:700;box-sizing:border-box">
              <textarea data-step-text="${j}" rows="2" placeholder="説明文" style="width:100%;resize:vertical;padding:5px 8px;border:1px solid #e5e7eb;border-radius:5px;font-size:13px;box-sizing:border-box">${bEsc(tx)}</textarea>
            </div>`;
          }).join('');
          fields = `<div data-step-list>${items}</div>`
            + `<button type="button" data-step-add style="margin-top:4px;padding:5px 12px;background:#eff6ff;border:1px solid #93c5fd;border-radius:6px;cursor:pointer;font-size:12px;color:#2563eb">＋ ステップを追加</button>`;
          break;
        }
      }
      return `<div data-block-idx="${i}" style="border:1px solid #e5e7eb;border-radius:10px;background:#fff;margin-bottom:10px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f9fafb;border-bottom:1px solid #e5e7eb">
          <span style="font-size:11px;font-weight:800;color:#fff;background:${type.color};padding:2px 10px;border-radius:99px">${type.label}</span>
          <span style="flex:1"></span>
          <button type="button" data-block-up="${i}" style="padding:2px 7px;border:1px solid #e5e7eb;border-radius:4px;background:#fff;cursor:pointer;opacity:${isFirst?.35:1}">↑</button>
          <button type="button" data-block-dn="${i}" style="padding:2px 7px;border:1px solid #e5e7eb;border-radius:4px;background:#fff;cursor:pointer;opacity:${isLast?.35:1}">↓</button>
          <button type="button" data-block-del="${i}" style="padding:2px 8px;border:1px solid #fca5a5;border-radius:4px;background:#fee2e2;cursor:pointer;font-size:12px;color:#dc2626">✕</button>
        </div>
        <div style="padding:12px" data-block-fields="${i}">${fields}</div>
      </div>`;
    }

    function renderBlockEditor() {
      const list = document.getElementById('block-editor-list');
      if (!list) return;
      list.innerHTML = _blocks.length
        ? _blocks.map((b,i) => renderBlockCard(b,i)).join('')
        : '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:20px 0">ブロックがありません。下の「＋ブロックを追加」から追加してください。</p>';
    }

    function readBlockEditorState() {
      const list = document.getElementById('block-editor-list');
      if (!list) return;
      _blocks.forEach((b, i) => {
        const card = list.querySelector(`[data-block-fields="${i}"]`);
        if (!card) return;
        // simple fields
        card.querySelectorAll('[data-field]').forEach(el => {
          b[el.dataset.field] = el.value;
        });
        // checklist items
        if (b.type === 'checklist') {
          const clItems = card.querySelectorAll('[data-cl-item]');
          b.items = Array.from(clItems).map(el => el.value);
        }
        // steps items
        if (b.type === 'steps') {
          const stepItems = card.querySelectorAll('[data-step-item]');
          b.items = Array.from(stepItems).map((_, j) => ({
            title: (card.querySelector(`[data-step-title="${j}"]`)?.value || ''),
            text:  (card.querySelector(`[data-step-text="${j}"]`)?.value  || ''),
          }));
        }
      });
    }

    function initBlockEditor(blocks) {
      _blocks = Array.isArray(blocks) ? blocks.map(b => ({ ...b,
        items: Array.isArray(b.items) ? b.items.map(it => typeof it==='object' ? {...it} : it) : undefined
      })) : [];
      renderBlockEditor();
      serializeBlocks();
    }

    // blocks → HTML 変換（既存の本文エディタに読み込むため）
    function blocksToHtml(blocks) {
      if (!Array.isArray(blocks)) return '';
      return blocks.map(b => {
        const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const nl2br = s => esc(s).replace(/\n/g,'<br>');
        switch (b.type) {
          case 'lead':
            return `<p class="fb-text" style="font-size:17px;line-height:1.9;font-weight:500">${nl2br(b.text)}</p>`;
          case 'h2':  return `<h2>${esc(b.text)}</h2>`;
          case 'h3':  return `<h3>${esc(b.text)}</h3>`;
          case 'text': return `<p>${nl2br(b.text)}</p>`;
          case 'tip':
            return `<blockquote><strong>${esc(b.label||'POINT')}</strong><br>${nl2br(b.text)}</blockquote>`;
          case 'callout':
            return `<blockquote>${nl2br(b.text)}</blockquote>`;
          case 'quote':
            return `<blockquote>${nl2br(b.text)}</blockquote>`;
          case 'checklist': {
            const title = b.title ? `<p><strong>${esc(b.title)}</strong></p>` : '';
            const items = (b.items||[]).map(item=>`<li>${esc(item)}</li>`).join('');
            return `${title}<ul>${items}</ul>`;
          }
          case 'steps': {
            const items = (b.items||[]).map(item => {
              const t = typeof item==='object' ? item.title||'' : item;
              const d = typeof item==='object' ? item.text||'' : '';
              return `<li><strong>${esc(t)}</strong>${d ? `<br>${nl2br(d)}` : ''}</li>`;
            }).join('');
            return `<ol>${items}</ol>`;
          }
          case 'cta':
            return `<blockquote>${nl2br(b.text)}<br><a href="${esc(b.buttonHref)}">${esc(b.buttonLabel)}</a></blockquote>`;
          default:
            return b.text ? `<p>${nl2br(b.text)}</p>` : '';
        }
      }).join('\n');
    }

    function setupBlockEditorEvents() {
      const container = document.getElementById('block-editor-container');
      if (!container) return;

      // イベント委任
      container.addEventListener('input', e => {
        readBlockEditorState();
        serializeBlocks();
      });

      container.addEventListener('click', e => {
        const t = e.target;

        // ── ブロック削除
        if (t.dataset.blockDel !== undefined) {
          readBlockEditorState();
          _blocks.splice(Number(t.dataset.blockDel), 1);
          renderBlockEditor(); serializeBlocks(); return;
        }
        // ── 上に移動
        if (t.dataset.blockUp !== undefined) {
          const idx = Number(t.dataset.blockUp);
          if (idx > 0) { readBlockEditorState(); [_blocks[idx-1],_blocks[idx]]=[_blocks[idx],_blocks[idx-1]]; renderBlockEditor(); serializeBlocks(); } return;
        }
        // ── 下に移動
        if (t.dataset.blockDn !== undefined) {
          const idx = Number(t.dataset.blockDn);
          if (idx < _blocks.length-1) { readBlockEditorState(); [_blocks[idx],_blocks[idx+1]]=[_blocks[idx+1],_blocks[idx]]; renderBlockEditor(); serializeBlocks(); } return;
        }
        // ── チェックリスト: 項目追加
        if (t.dataset.clAdd !== undefined) {
          readBlockEditorState();
          const card = t.closest('[data-block-idx]');
          if (card) { const idx = Number(card.dataset.blockIdx); if (_blocks[idx]) { _blocks[idx].items = [...(_blocks[idx].items||[]), '']; renderBlockEditor(); serializeBlocks(); } } return;
        }
        // ── チェックリスト: 項目削除
        if (t.dataset.clDel !== undefined) {
          readBlockEditorState();
          const card = t.closest('[data-block-idx]');
          if (card) { const idx = Number(card.dataset.blockIdx); if (_blocks[idx]) { _blocks[idx].items.splice(Number(t.dataset.clDel), 1); renderBlockEditor(); serializeBlocks(); } } return;
        }
        // ── ステップ: 追加
        if (t.dataset.stepAdd !== undefined) {
          readBlockEditorState();
          const card = t.closest('[data-block-idx]');
          if (card) { const idx = Number(card.dataset.blockIdx); if (_blocks[idx]) { _blocks[idx].items = [...(_blocks[idx].items||[]), {title:'',text:''}]; renderBlockEditor(); serializeBlocks(); } } return;
        }
        // ── ステップ: 削除
        if (t.dataset.stepDel !== undefined) {
          readBlockEditorState();
          const card = t.closest('[data-block-idx]');
          if (card) { const idx = Number(card.dataset.blockIdx); if (_blocks[idx]) { _blocks[idx].items.splice(Number(t.dataset.stepDel), 1); renderBlockEditor(); serializeBlocks(); } } return;
        }
        // ── ブロック追加
        if (t.id === 'block-add-btn' || t.dataset.addBlock !== undefined) {
          const sel = document.getElementById('block-type-select');
          if (!sel) return;
          const type = sel.value;
          if (!type) return;
          readBlockEditorState();
          const defaults = { lead:{type:'lead',text:''}, h2:{type:'h2',text:''}, h3:{type:'h3',text:''}, text:{type:'text',text:''}, tip:{type:'tip',label:'POINT',text:''}, callout:{type:'callout',text:''}, quote:{type:'quote',text:''}, checklist:{type:'checklist',title:'',items:['']}, steps:{type:'steps',items:[{title:'',text:''}]}, cta:{type:'cta',text:'',buttonLabel:'',buttonHref:''} };
          _blocks.push(defaults[type] || {type,text:''});
          renderBlockEditor(); serializeBlocks();
          document.getElementById('block-editor-list')?.lastElementChild?.scrollIntoView({behavior:'smooth'});
          return;
        }
      });
    }

    function renderTable() {
      const tbody = document.getElementById('features-table-body');
      if (!tbody) return;
      const qEl = document.getElementById('features-filter-query');
      const sEl = document.getElementById('features-filter-status');
      const q = (qEl && 'value' in qEl ? String(qEl.value || '').toLowerCase().trim() : '');
      const status = (sEl && 'value' in sEl ? String(sEl.value || '') : '');
      const list = loadFeatures()
        .filter(f => {
          if (status && f.status !== status) return false;
          if (q) { const text = [f.title || '', f.summary || '', String(f.body || '').replace(/<[^>]*>/g, ' ')].join(' ').toLowerCase(); if (!text.includes(q)) return false; }
          return true;
        })
        .sort((a, b) => new Date(b.updated_at || b.updatedAt || b.created_at || 0).getTime() - new Date(a.updated_at || a.updatedAt || a.created_at || 0).getTime());
      tbody.textContent = '';
      for (const f of list) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', f.id);
        const tdTitle = document.createElement('td'); tdTitle.style.padding = '12px'; tdTitle.style.borderBottom = '1px solid var(--color-border)';
        const a = document.createElement('a'); a.className = 'svc-link'; a.href = `?id=${encodeURIComponent(f.id)}`; a.textContent = f.title || '(無題)'; tdTitle.appendChild(a);
        const tdStatus = document.createElement('td'); tdStatus.style.padding = '12px'; tdStatus.style.borderBottom = '1px solid var(--color-border)'; tdStatus.textContent = labelStatus(f.status);
        const tdDate = document.createElement('td'); tdDate.style.padding = '12px'; tdDate.style.borderBottom = '1px solid var(--color-border)'; tdDate.textContent = formatDate(f.updated_at || f.updatedAt || f.created_at);
        const tdOps = document.createElement('td'); tdOps.style.padding = '12px'; tdOps.style.borderBottom = '1px solid var(--color-border)';
        const aEdit = document.createElement('a'); aEdit.className = 'btn btn-ghost'; aEdit.href = `?id=${encodeURIComponent(f.id)}`; aEdit.textContent = '編集';
        const btnStatus = document.createElement('button'); btnStatus.type = 'button'; btnStatus.className = 'btn btn-ghost'; btnStatus.setAttribute('data-action', 'status'); btnStatus.setAttribute('data-id', f.id); btnStatus.textContent = '公開切替';
        const btnDelete = document.createElement('button'); btnDelete.type = 'button'; btnDelete.className = 'btn btn-ghost danger'; btnDelete.setAttribute('data-action', 'delete'); btnDelete.setAttribute('data-id', f.id); btnDelete.textContent = '削除';
        btnStatus.addEventListener('click', () => { if (window.__featureStatus) window.__featureStatus(f.id); });
        btnDelete.addEventListener('click', () => { if (window.__featureDelete) window.__featureDelete(f.id); });
        tdOps.appendChild(aEdit); tdOps.appendChild(btnStatus); tdOps.appendChild(btnDelete);
        tr.appendChild(tdTitle); tr.appendChild(tdStatus); tr.appendChild(tdDate); tr.appendChild(tdOps);
        tbody.appendChild(tr);
      }
      try { const info = document.getElementById('features-filter-result'); if (info) { info.textContent = `検索結果: ${list.length}件`; } } catch {}
      tbody.querySelectorAll('tr[data-id]').forEach(tr => {
        tr.addEventListener('click', (e) => {
          if (e.defaultPrevented) return;
          if (e.target.closest('a,button')) return;
          const id = tr.getAttribute('data-id');
          location.href = `?id=${encodeURIComponent(id)}`;
        });
      });
    }

    function showEditor() {
      const listSec = document.getElementById('features-list-section');
      const editSec = document.getElementById('feature-editor-section');
      if (listSec) { listSec.hidden = true; listSec.style.display = 'none'; }
      if (editSec) { editSec.hidden = false; editSec.style.display = ''; }
      const modal = document.getElementById('feature-modal');
      const bd = document.getElementById('feature-modal-backdrop');
      if (modal) { modal.hidden = false; requestAnimationFrame(() => modal.classList.add('is-open')); }
      if (bd) { bd.hidden = false; requestAnimationFrame(() => bd.classList.add('is-open')); }
      document.body.classList.add('modal-open');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showList() {
      const listSec = document.getElementById('features-list-section');
      const editSec = document.getElementById('feature-editor-section');
      if (listSec) { listSec.hidden = false; listSec.style.display = ''; }
      if (editSec) { editSec.hidden = true; editSec.style.display = 'none'; }
      const modal = document.getElementById('feature-modal');
      const bd = document.getElementById('feature-modal-backdrop');
      if (modal) { modal.classList.remove('is-open'); }
      if (bd) { bd.classList.remove('is-open'); }
      setTimeout(() => { if (modal) modal.hidden = true; if (bd) bd.hidden = true; }, 200);
      const url = new URL(location.href); url.searchParams.delete('id'); history.replaceState({}, '', url);
      document.body.classList.remove('modal-open');
    }

    function onNew() {
      fillForm({ status: 'draft' });
      showMsg('');
    }

    async function onSubmit(e) {
      e.preventDefault();
      const form = readForm();
      if (!form.title) { showMsg('タイトルは必須です。'); return; }
      const isDataThumb = form.thumbnail && /^data:image\//i.test(form.thumbnail);
      if (isDataThumb && form.thumbnail.length > 1_000_000) { showMsg('サムネイル画像が大きすぎます。URLを使用してください。'); return; }
      if (!form.slug) form.slug = autoSlug(form.title);

      showMsg('保存中...');
      try {
        const url = form.id ? `/api/admin/features/${form.id}` : '/api/admin/features';
        const method = form.id ? 'PUT' : 'POST';
        const res = await fetch(url, { method, headers: h(), body: JSON.stringify(form) });
        if (!res.ok) { const err = await res.json().catch(() => ({})); showMsg(`エラー: ${err.error || res.status}`); return; }
        const saved = await res.json();
        showMsg('保存しました。');
        await refreshFeatures();
        if (!form.id && saved?.id) { updateUrlForEdit(saved.id); fillForm(saved); }
      } catch (err) { showMsg(`保存エラー: ${err.message}`); return; }
      renderTable();
      fillForm(list.find(x => x.id === form.id));
      updateUrlForEdit(form.id);
    }

    function openEditorForId(id) {
      const item = _cache.find(f => f.id === id);
      showEditor();
      if (!item) { onNew(); updateUrlForEdit('new'); }
      else { fillForm(item); updateUrlForEdit(id); }
    }

    // Global handlers
    window.__featureEdit = function (id) { openEditorForId(id); };
    window.__featureStatus = async function (id) {
      const item = _cache.find(f => f.id === id); if (!item) return;
      const cur = item.status || 'draft';
      const next = cur === 'published' ? 'private' : (cur === 'private' ? 'draft' : 'published');
      try {
        const res = await fetch(`/api/admin/features/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify({ status: next }) });
        if (!res.ok) return;
        await refreshFeatures();
      } catch {}
    };
    window.__featureDelete = async function (id) {
      if (!confirm('この特集を削除しますか？')) return;
      try {
        const res = await fetch(`/api/admin/features/${id}`, { method: 'DELETE', headers: h() });
        if (!res.ok) return;
        await refreshFeatures();
        showList();
      } catch {}
    };
    window.__featureCreate = function () { onNew(); updateUrlForEdit('new'); showEditor(); };
    window.__featureBack = function () { showList(); };

    // Export/Import
    function exportFeatures() {
      try {
        const data = loadFeatures();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        a.href = url; a.download = `features-backup-${ts}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        const msg = document.getElementById('feature-message'); if (msg) msg.textContent = 'エクスポートしました。';
      } catch { const msg = document.getElementById('feature-message'); if (msg) msg.textContent = 'エクスポートに失敗しました。'; }
    }

    async function importFeaturesFile(e) {
      const file = e.target.files && e.target.files[0]; if (!file) return;
      try {
        const text = await file.text(); const arr = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error('Invalid JSON');
        const current = loadFeatures(); const map = new Map(current.map(x => [x.id, x]));
        let added = 0, updated = 0, skipped = 0;
        for (const f of arr) {
          if (!f || typeof f !== 'object') { skipped++; continue; }
          if (!f.id) f.id = uuid(); if (!f.createdAt) f.createdAt = new Date().toISOString(); if (!f.updatedAt) f.updatedAt = f.createdAt; if (!f.status) f.status = 'draft'; if (typeof f.thumbnail === 'undefined') f.thumbnail = '';
          const existed = map.get(f.id);
          if (!existed) { map.set(f.id, f); added++; }
          else { const isNewer = new Date(f.updatedAt).getTime() > new Date(existed.updatedAt).getTime(); if (isNewer) { map.set(f.id, f); updated++; } else { skipped++; } }
        }
        const merged = Array.from(map.values());
        try { saveFeatures(merged); } catch { const msg = document.getElementById('feature-message'); if (msg) msg.textContent = '保存容量を超えました。'; return; }
        renderTable();
        const msg = document.getElementById('feature-message'); if (msg) msg.textContent = `インポートしました。追加:${added}件 / 更新:${updated}件 / スキップ:${skipped}件`;
      } catch { const msg = document.getElementById('feature-message'); if (msg) msg.textContent = 'インポートに失敗しました。JSON形式を確認してください。'; }
      finally { e.target.value = ''; }
    }

    async function seedFromStatic() {
      try {
        const res = await fetch('/feature/feature-list.json');
        if (!res.ok) throw new Error(String(res.status));
        const arr = await res.json();
        const now = new Date().toISOString();
        const mapped = Array.isArray(arr) ? arr.map((x, i) => ({ id: uuid(), title: x.title || `サンプル${i + 1}`, summary: x.excerpt || '', body: '', status: 'draft', createdAt: now, updatedAt: now, thumbnail: (x.image || '').replace(/^\.\//, '/feature/') })) : [];
        const cur = loadFeatures(); const merged = cur.concat(mapped);
        try { saveFeatures(merged); } catch { const msg = document.getElementById('feature-message'); if (msg) msg.textContent = '保存容量を超えました。'; return; }
        renderTable();
        const msg = document.getElementById('feature-message'); if (msg) msg.textContent = 'サンプルを読み込みました。';
      } catch { const msg = document.getElementById('feature-message'); if (msg) msg.textContent = 'サンプルの読み込みに失敗しました。'; }
    }

    async function restoreRecommendedSet() {
      try {
        const [f1, f2] = await Promise.all([fetch('/feature/feature-list.json'), fetch('/data/articles.json')]);
        const arr1 = (f1.ok ? await f1.json() : []); const arr2 = (f2.ok ? await f2.json() : []);
        const now = new Date().toISOString();
        const mapCard = (x, i) => ({ id: uuid(), title: x.title || `特集${i + 1}`, summary: x.excerpt || '', body: '', status: 'published', createdAt: now, updatedAt: now, thumbnail: (x.image || '').replace(/^\.\//, '/feature/') });
        const a = Array.isArray(arr1) ? arr1.map(mapCard) : []; const b = Array.isArray(arr2) ? arr2.map(mapCard) : [];
        const mergedNew = a.concat(b); const cur = loadFeatures();
        const titles = new Set(cur.map(x => x.title));
        const final = cur.concat(mergedNew.filter(x => !titles.has(x.title)));
        try { saveFeatures(final); } catch { const msg = document.getElementById('feature-message'); if (msg) msg.textContent = '保存容量を超えました。'; return; }
        renderTable();
        const msg = document.getElementById('feature-message'); if (msg) msg.textContent = '推奨セットで復元しました。（公開）';
      } catch { const msg = document.getElementById('feature-message'); if (msg) msg.textContent = '復元に失敗しました。'; }
    }

    // Init
    const formEl = document.getElementById('feature-form');
    if (formEl) formEl.addEventListener('submit', onSubmit);
    const btnSave = document.getElementById('feature-save');
    if (btnSave) { btnSave.addEventListener('click', (e) => { const form = document.getElementById('feature-form'); if (form && typeof form.requestSubmit === 'function') { e.preventDefault(); form.requestSubmit(); } }); }
    const btnDraft = document.getElementById('feature-save-draft');
    if (btnDraft) { btnDraft.addEventListener('click', () => { const sel = document.getElementById('feature-status'); if (sel) sel.value = 'draft'; const form = document.getElementById('feature-form'); if (form && typeof form.requestSubmit === 'function') { form.requestSubmit(); } else if (form) { form.submit(); } }); }
    const btnNewInForm = document.getElementById('feature-new');
    if (btnNewInForm) { btnNewInForm.addEventListener('click', onNew); }
    const btnCreate = document.getElementById('features-create');
    if (btnCreate) { btnCreate.addEventListener('click', () => { onNew(); updateUrlForEdit('new'); showEditor(); }); }

    // Filters
    try {
      const qEl = document.getElementById('features-filter-query');
      const sEl = document.getElementById('features-filter-status');
      const cEl = document.getElementById('features-filter-clear');
      const kq = 'glowup:features:filter:q'; const ks = 'glowup:features:filter:status';
      if (qEl && 'value' in qEl) { const savedQ = localStorage.getItem(kq); if (savedQ !== null) qEl.value = savedQ; qEl.addEventListener('input', () => { localStorage.setItem(kq, String(qEl.value || '')); renderTable(); }); }
      if (sEl && 'value' in sEl) { const savedS = localStorage.getItem(ks); if (savedS !== null) sEl.value = savedS; sEl.addEventListener('change', () => { localStorage.setItem(ks, String(sEl.value || '')); renderTable(); }); }
      if (cEl) { cEl.addEventListener('click', () => { if (qEl && 'value' in qEl) qEl.value = ''; if (sEl && 'value' in sEl) sEl.value = ''; localStorage.removeItem(kq); localStorage.removeItem(ks); renderTable(); }); }
    } catch {}

    // Auto export toggle
    try {
      const key = 'glowup:features:autoExport'; const cb = document.getElementById('features-auto-export');
      if (cb && cb instanceof HTMLInputElement) {
        const saved = localStorage.getItem(key);
        if (saved === null) { cb.checked = false; localStorage.setItem(key, '0'); } else { cb.checked = saved === '1'; }
        cb.addEventListener('change', () => localStorage.setItem(key, cb.checked ? '1' : '0'));
      }
    } catch {}

    const btnExport = document.getElementById('features-export'); if (btnExport) btnExport.addEventListener('click', exportFeatures);
    const importInput = document.getElementById('features-import-input'); if (importInput) importInput.addEventListener('change', importFeaturesFile);

    // Modal close
    const closeBtn = document.getElementById('feature-modal-close'); if (closeBtn) closeBtn.addEventListener('click', showList);
    const bd = document.getElementById('feature-modal-backdrop'); if (bd) bd.addEventListener('click', showList);

    // RTE editor
    const ed = document.getElementById('feature-body-editor');
    const ta = document.getElementById('feature-body');
    if (ed && ta) {
      ed.addEventListener('input', () => { ta.value = sanitizeHtml(ed.innerHTML); updatePreview(); });
      const sel = document.getElementById('rte-heading');
      if (sel) { sel.addEventListener('change', () => { const tag = sel.value || 'p'; document.execCommand('formatBlock', false, tag); }); }
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.rte-btn'); if (!btn) return;
        const cmd = btn.getAttribute('data-cmd'); const val = btn.getAttribute('data-value');
        if (cmd === 'formatBlock' && val) { document.execCommand(cmd, false, val); return; }
        if (btn.id === 'rte-link') { const url = prompt('リンクURLを入力'); if (url) { document.execCommand('createLink', false, url); ta.value = sanitizeHtml(ed.innerHTML); updatePreview(); } return; }
        if (btn.id === 'rte-image') { const url = prompt('画像URLを入力'); if (url) { document.execCommand('insertImage', false, url); ta.value = sanitizeHtml(ed.innerHTML); updatePreview(); } return; }
        if (btn.id === 'rte-image-file') { const fileEl = document.getElementById('rte-image-file-input'); if (fileEl) fileEl.click(); return; }
        if (['rte-align-left', 'rte-align-center', 'rte-align-right'].includes(btn.id)) {
          const cmd2 = btn.id === 'rte-align-left' ? 'justifyLeft' : btn.id === 'rte-align-center' ? 'justifyCenter' : 'justifyRight';
          document.execCommand(cmd2, false, null);
          ta.value = sanitizeHtml(ed.innerHTML); updatePreview(); return;
        }
        const insertMap = {
          'rte-insert-grid': '<div class="fb-grid"><div class="fb-card fb-item" data-x="1" data-y="1" data-w="6" data-h="1"><h3 class="fb-heading">カードタイトル</h3><p class="fb-text">説明文をここに。</p></div><div class="fb-block fb-item" data-x="7" data-y="1" data-w="6" data-h="1"><h3 class="fb-heading">ブロック見出し</h3><p class="fb-text">テキストブロック。</p></div></div>',
          'rte-insert-card': '<div class="fb-card fb-item" data-x="1" data-y="1" data-w="6" data-h="1"><h3 class="fb-heading">カードタイトル</h3><p class="fb-text">カード説明。</p></div>',
          'rte-insert-block': '<div class="fb-block fb-item" data-x="1" data-y="1" data-w="12" data-h="1"><h3 class="fb-heading">ブロック見出し</h3><p class="fb-text">本文テキスト。</p></div>',
          'rte-insert-slider': '<div class="fb-slider fb-item" data-x="1" data-y="1" data-w="12" data-h="1"><div class="fb-slide fb-card"><h3 class="fb-heading">スライド1</h3><p class="fb-text">説明1</p></div></div>',
          'rte-insert-image-block': '<div class="fb-item" data-x="1" data-y="1" data-w="12" data-h="1"><img class="fb-image" src="" alt="" /></div>',
        };
        if (insertMap[btn.id]) { document.execCommand('insertHTML', false, insertMap[btn.id]); ta.value = sanitizeHtml(ed.innerHTML); return; }
        if (cmd) { document.execCommand(cmd, false, null); ta.value = sanitizeHtml(ed.innerHTML); updatePreview(); }
      });
    }

    const thumbInput = document.getElementById('feature-thumbnail');
    if (thumbInput) thumbInput.addEventListener('input', () => updateThumbPreview(thumbInput.value));

    // 初回データ読み込み
    refreshFeatures().then(() => {
      const urlId = getParam('id');
      if (urlId) { if (urlId === 'new') { onNew(); showEditor(); } else { openEditorForId(urlId); } }
      else { showList(); }
    });

    renderTable();

    window.addEventListener('popstate', () => {
      const pid = getParam('id');
      if (pid) { if (pid === 'new') { onNew(); showEditor(); } else { openEditorForId(pid); } }
      else { showList(); }
    });

    return () => {
      try { document.head.removeChild(style); } catch {}
      delete window.__featureEdit;
      delete window.__featureStatus;
      delete window.__featureDelete;
      delete window.__featureCreate;
      delete window.__featureBack;
    };
  }, []);

  return (
    <main className="section">
      <div>
        <section className="stack">
          <h1 className="section-title">特集管理</h1>
          <section id="features-list-section" className="stack">
            <div style={{display:'flex',alignItems:'center'}}>
              <h2 className="section-title" style={{fontSize:'22px',margin:'0'}}>特集一覧</h2>
              <div className="cluster" style={{marginLeft:'auto'}}>
                <button type="button" id="features-export" className="btn btn-ghost">エクスポート（JSON）</button>
                <label htmlFor="features-import-input" className="btn btn-ghost" style={{margin:'0'}}>インポート</label>
                <input id="features-import-input" type="file" accept="application/json" style={{display:'none'}} />
                <button type="button" id="features-create" className="btn">新規特集を作成</button>
                <span className="rte-sep"></span>
                <label className="cluster" style={{alignItems:'center',gap:'8px'}}>
                  <span className="muted">検索</span>
                  <input id="features-filter-query" type="search" placeholder="タイトル・概要・本文" style={{minWidth:'220px'}} />
                </label>
                <label className="cluster" style={{alignItems:'center',gap:'8px'}}>
                  <span className="muted">ステータス</span>
                  <select id="features-filter-status">
                    <option value="">全て</option>
                    <option value="draft">下書き</option>
                    <option value="published">公開</option>
                    <option value="private">非公開</option>
                  </select>
                </label>
                <button type="button" id="features-filter-clear" className="btn btn-ghost">クリア</button>
                <span id="features-filter-result" className="muted" style={{marginLeft:'8px'}}></span>
              </div>
            </div>
            <div className="card" style={{overflow:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>
                    <th style={{textAlign:'left',padding:'12px',borderBottom:'1px solid var(--color-border)'}}>タイトル</th>
                    <th style={{textAlign:'left',padding:'12px',borderBottom:'1px solid var(--color-border)'}}>ステータス</th>
                    <th style={{textAlign:'left',padding:'12px',borderBottom:'1px solid var(--color-border)'}}>更新日</th>
                    <th style={{textAlign:'left',padding:'12px',borderBottom:'1px solid var(--color-border)'}}>操作</th>
                  </tr>
                </thead>
                <tbody id="features-table-body"></tbody>
              </table>
            </div>
          </section>

          <section id="feature-editor-section" className="stack" hidden>
            <div id="feature-modal-backdrop" className="modal-backdrop" hidden></div>
            <div id="feature-modal" className="modal" role="dialog" aria-modal="true" aria-labelledby="feature-modal-title" hidden>
              <div className="modal-content card" style={{padding:'20px'}}>
                <div className="cluster" style={{justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <h2 id="feature-modal-title" style={{margin:'0'}}>特集編集</h2>
                  <button id="feature-modal-close" className="btn btn-ghost" type="button" aria-label="閉じる">×</button>
                </div>
                <form id="feature-form" className="stack" style={{padding:'4px',maxWidth:'unset'}}>
                  <input type="hidden" id="feature-id" name="id" />
                  <div className="stack">
                    <label>タイトル<input id="feature-title" name="title" type="text" placeholder="タイトルを入力" required /></label>
                    <div className="cluster" style={{gap:'12px',flexWrap:'wrap'}}>
                      <label style={{flex:'1',minWidth:'200px'}}>スラッグ（URL）<input id="feature-slug" name="slug" type="text" placeholder="auto-generated（英数字-）" /></label>
                      <label style={{flex:'1',minWidth:'160px'}}>カテゴリ<input id="feature-category" name="category" type="text" placeholder="清潔感・写真撮影 等" /></label>
                      <label style={{width:'100px'}}>読了時間(分)<input id="feature-reading-time" name="reading_time" type="number" min={1} max={60} defaultValue={5} style={{width:'80px'}} /></label>
                    </div>
                    <label>SEO説明文（description）<input id="feature-description" name="description" type="text" placeholder="検索結果やSNSに表示される1文（〜120文字）" /></label>
                    <label>概要<textarea id="feature-summary" name="summary" rows={3} placeholder="概要（リード文）"></textarea></label>
                    <label>サムネイル画像URL<input id="feature-thumbnail" name="thumbnail" type="url" placeholder="https://example.com/cover.jpg または data:image/..." /></label>
                    <div className="cluster" style={{alignItems:'center'}}>
                      <label className="btn btn-ghost" htmlFor="feature-thumbnail-file" style={{margin:'0'}}>端末から選択</label>
                      <input id="feature-thumbnail-file" type="file" accept="image/*" style={{display:'none'}} />
                      <span className="muted">URLまたは端末画像のどちらかを指定できます。</span>
                    </div>
                    <div id="feature-thumb-preview" className="card" style={{maxWidth:'520px',overflow:'hidden'}}>
                      <img id="feature-thumbnail-preview" alt="サムネイルプレビュー" style={{display:'none',aspectRatio:'4/3',width:'100%',objectFit:'cover'}} />
                    </div>
                    <label htmlFor="feature-body-editor">本文</label>
                    <div className="rte" style={{position:'relative'}}>
                      <div className="rte-toolbar" role="toolbar" aria-label="テキスト編集">
                        <select id="rte-heading" title="見出し">
                          <option value="p">段落</option>
                          <option value="h2">見出し H2</option>
                          <option value="h3">見出し H3</option>
                          <option value="h4">見出し H4</option>
                        </select>
                        <button type="button" className="rte-btn" data-cmd="bold" title="太字"><strong>B</strong></button>
                        <button type="button" className="rte-btn" data-cmd="italic" title="斜体"><em>I</em></button>
                        <button type="button" className="rte-btn" data-cmd="underline" title="下線"><span style={{textDecoration:'underline'}}>U</span></button>
                        <span className="rte-sep"></span>
                        <button type="button" className="rte-btn" data-cmd="insertUnorderedList" title="箇条書き">• List</button>
                        <button type="button" className="rte-btn" data-cmd="insertOrderedList" title="番号付き">1. List</button>
                        <button type="button" className="rte-btn" data-cmd="formatBlock" data-value="blockquote" title="引用">{`""`}</button>
                        <span className="rte-sep"></span>
                        <button type="button" className="rte-btn" id="rte-link" title="リンク">Link</button>
                        <button type="button" className="rte-btn" id="rte-image" title="画像">Img</button>
                        <button type="button" className="rte-btn" id="rte-image-file" title="端末から画像">Img(端末)</button>
                        <input id="rte-image-file-input" type="file" accept="image/*" style={{display:'none'}} />
                        <span className="rte-sep"></span>
                        <button type="button" className="rte-btn" id="rte-align-left" title="左揃え">⟸</button>
                        <button type="button" className="rte-btn" id="rte-align-center" title="中央揃え">⇔</button>
                        <button type="button" className="rte-btn" id="rte-align-right" title="右揃え">⟹</button>
                        <span className="rte-sep"></span>
                        <label className="muted" style={{display:'inline-flex',alignItems:'center',gap:'6px'}}>
                          <span>画像サイズ</span>
                          <select id="rte-image-size" title="画像サイズ">
                            <option value="">auto</option>
                            <option value="sm">小</option>
                            <option value="md">中</option>
                            <option value="lg">大</option>
                            <option value="full">全幅</option>
                          </select>
                        </label>
                        <span className="rte-sep"></span>
                        <button type="button" className="rte-btn" data-cmd="removeFormat" title="書式クリア">Clear</button>
                        <span className="rte-sep"></span>
                        <span className="muted">挿入:</span>
                        <button type="button" className="rte-btn" id="rte-insert-grid" title="グリッド">Grid</button>
                        <button type="button" className="rte-btn" id="rte-insert-card" title="カード">Card</button>
                        <button type="button" className="rte-btn" id="rte-insert-block" title="ブロック">Block</button>
                        <button type="button" className="rte-btn" id="rte-insert-slider" title="スライダー">Slider</button>
                        <button type="button" className="rte-btn" id="rte-insert-image-block" title="画像ブロック">Image+</button>
                      </div>
                      <div id="feature-body-editor" className="rte-editor" contentEditable="true" aria-label="本文エディタ" style={{paddingTop:'8px'}}></div>
                      <textarea id="feature-body" name="body" hidden></textarea>
                      <div className="card" style={{marginTop:'12px',padding:'12px'}}>
                        <div style={{display:'flex',alignItems:'center'}}>
                          <strong>プレビュー（編集用）</strong>
                          <span className="muted" style={{marginLeft:'auto'}}>保存前の見た目を確認できます</span>
                        </div>
                        <div id="feature-preview" style={{marginTop:'8px'}}></div>
                      </div>
                    </div>

                    <p className="muted" style={{fontSize:'12px',margin:'-4px 0 0',padding:'8px 12px',background:'rgba(201,168,76,0.06)',border:'1px solid rgba(201,168,76,0.2)',borderRadius:'6px'}}>
                      💡 シードデータで追加した記事（blocks形式）は上の「本文」エディタに自動変換して読み込まれます。編集して保存するとHTML形式で上書き保存されます。
                    </p>

                    <div className="cluster" style={{alignItems:'center',gap:'12px'}}>
                      <label>ステータス
                        <select id="feature-status" name="status">
                          <option value="draft">下書き</option>
                          <option value="published">公開</option>
                          <option value="private">非公開</option>
                        </select>
                      </label>
                      <span id="feature-message" className="muted"></span>
                      <div style={{marginLeft:'auto',display:'flex',gap:'8px'}}>
                        <button type="button" id="feature-new" className="btn btn-ghost">新規</button>
                        <button type="button" id="feature-save-draft" className="btn btn-ghost">下書き保存</button>
                        <button type="submit" id="feature-save" className="btn">保存</button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
