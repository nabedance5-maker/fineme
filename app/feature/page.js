'use client';
import { useEffect, useRef } from 'react';

export default function FeaturePage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const style = document.createElement('style');
    style.textContent = `
/* Feature Builder utility styles */
.fb-grid{ display:grid; grid-template-columns: repeat(12, 1fr); gap: 12px; }
.fb-item{ grid-column: var(--x, auto) / span var(--w, 12); grid-row: var(--y, auto) / span var(--h, 1); }
.fb-card{ background:#fff; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 6px 18px rgba(2,6,23,0.06); padding:12px; }
.fb-block{ background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:12px; }
.fb-image{ display:block; max-width:100%; height:auto; border-radius:12px; }
.fb-heading{ font-weight:800; font-size:clamp(20px,3.2vw,28px); }
.fb-text{ font-size:clamp(14px,1.8vw,16px); color:#374151; }
.fb-slider{ position:relative; }
.fb-track{ display:flex; gap:12px; overflow-x:auto; scroll-snap-type:x mandatory; padding-bottom:8px; }
.fb-slide{ flex:0 0 auto; width:min(260px, 80vw); scroll-snap-align:start; }
.fb-nav{ position:absolute; right:8px; top:-36px; display:flex; gap:8px; }
.fb-btn{ background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; box-shadow:0 3px 10px rgba(2,6,23,0.06); }
.fb-edit .fb-item{ outline:1px dashed rgba(37,99,235,0.4); }
.features-grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:16px; }
.features-grid .card img{ width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:8px 8px 0 0; }
    `;
    document.head.appendChild(style);

    // --- feature-builder logic ---
    function initFeatureBuilder(root) {
      try {
        const scope = root || document;
        scope.querySelectorAll('[data-x], [data-y], [data-w], [data-h]').forEach(el => {
          if (!(el instanceof HTMLElement)) return;
          const x = el.getAttribute('data-x'); const y = el.getAttribute('data-y');
          const w = el.getAttribute('data-w'); const h = el.getAttribute('data-h');
          if (x) el.style.setProperty('--x', String(Number(x)));
          if (y) el.style.setProperty('--y', String(Number(y)));
          if (w) el.style.setProperty('--w', String(Number(w)));
          if (h) el.style.setProperty('--h', String(Number(h)));
          if (!el.classList.contains('fb-item')) el.classList.add('fb-item');
        });
        scope.querySelectorAll('.fb-slider').forEach(slider => {
          if (!(slider instanceof HTMLElement)) return;
          let track = slider.querySelector('.fb-track');
          if (!(track instanceof HTMLElement)) {
            track = document.createElement('div'); track.className = 'fb-track';
            Array.from(slider.children).forEach(ch => { if (ch !== track) { if (ch instanceof HTMLElement && ch.classList.contains('fb-slide')) track.appendChild(ch); } });
            slider.appendChild(track);
          }
          let nav = slider.querySelector('.fb-nav');
          if (!(nav instanceof HTMLElement)) {
            nav = document.createElement('div'); nav.className = 'fb-nav';
            const prev = document.createElement('button'); prev.className = 'fb-btn'; prev.type = 'button'; prev.textContent = '←';
            const next = document.createElement('button'); next.className = 'fb-btn'; next.type = 'button'; next.textContent = '→';
            prev.addEventListener('click', () => { if (track) track.scrollBy({ left: -300, behavior: 'smooth' }); });
            next.addEventListener('click', () => { if (track) track.scrollBy({ left: 300, behavior: 'smooth' }); });
            nav.appendChild(prev); nav.appendChild(next); slider.appendChild(nav);
          }
        });
        if (location.hash === '#edit') {
          const canvas = scope.querySelector('.fb-grid');
          if (canvas) { canvas.classList.add('fb-edit'); }
          scope.querySelectorAll('.fb-item').forEach(el => {
            if (!(el instanceof HTMLElement)) return;
            el.setAttribute('draggable', 'true');
            el.addEventListener('dragstart', (e) => { try { if (e.dataTransfer) e.dataTransfer.setData('text/plain', 'drag'); el.dataset.dragStartX = String(e.clientX || 0); } catch {} });
            el.addEventListener('dragend', (e) => {
              try { const start = Number(el.dataset.dragStartX || '0'); const dx = (e.clientX || 0) - start; const cur = Number(el.style.getPropertyValue('--x') || '1'); const nx = Math.max(1, cur + (dx > 0 ? 1 : -1)); el.style.setProperty('--x', String(nx)); el.setAttribute('data-x', String(nx)); delete el.dataset.dragStartX; } catch {}
            });
          });
        }
      } catch (e) { /* noop */ }
    }

    // --- feature.js logic ---
    const FEATURES_KEY = 'glowup:features';

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function loadFeatures() {
      try {
        const raw = localStorage.getItem(FEATURES_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch { return []; }
    }

    function sanitizeHtml(html) {
      const allowedTags = new Set(['P','H2','H3','H4','UL','OL','LI','STRONG','EM','U','A','BLOCKQUOTE','IMG','BR','DIV','SECTION','ASIDE','FIGURE','FIGCAPTION','SPAN']);
      const allowedAttrs = {
        'A': ['href','target','rel','class'], 'IMG': ['src','alt','data-size','class'],
        'P': ['data-align','class'], 'H2': ['data-align','class'], 'H3': ['data-align','class'], 'H4': ['data-align','class'],
        'LI': ['data-align','class'], 'UL': ['data-align','class'], 'OL': ['data-align','class'], 'BLOCKQUOTE': ['data-align','class'],
        'DIV': ['data-align','class','data-x','data-y','data-w','data-h','data-role','data-type'],
        'SECTION': ['class'], 'ASIDE': ['class'], 'FIGURE': ['class'], 'FIGCAPTION': ['class'], 'SPAN': ['class']
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
          el.setAttribute('rel', 'noopener');
          el.setAttribute('target', '_blank');
        }
      }
      for (const el of toRemove) {
        const parent = el.parentNode;
        while (el.firstChild) { parent.insertBefore(el.firstChild, el); }
        parent.removeChild(el);
      }
      return tmp.innerHTML;
    }

    function firstImageSrcFromHtml(html) {
      try {
        if (!html) return null;
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const img = tmp.querySelector('img[src]');
        const src = img?.getAttribute('src') || null;
        return src || null;
      } catch { return null; }
    }

    function renderList(items) {
      const grid = document.getElementById('feature-list');
      const empty = document.getElementById('feature-empty');
      if (!grid || !empty) return;
      grid.textContent = '';
      if (!items.length) { empty.hidden = false; return; }
      empty.hidden = true;
      for (const f of items) {
        const isLocal = typeof f.status !== 'undefined';
        const tag = isLocal ? 'a' : 'div';
        const card = document.createElement(tag);
        card.className = 'card';
        card.style.display = 'block';
        card.style.padding = '12px';
        if (isLocal) { card.href = `?id=${encodeURIComponent(f.id)}`; }
        let imgSrc = null;
        if (isLocal) {
          const isValidThumb = f.thumbnail && (/^https?:\/\//i.test(f.thumbnail) || /^data:image\//i.test(f.thumbnail));
          imgSrc = isValidThumb ? f.thumbnail : firstImageSrcFromHtml(f.body);
        } else {
          imgSrc = f.image || null;
        }
        if (!imgSrc) { imgSrc = '/feature/images/feature-1.webp'; }
        if (imgSrc) {
          try { const im = document.createElement('img'); im.src = imgSrc; im.alt = String(f.title || '特集画像'); card.appendChild(im); } catch (e) {}
        }
        const inner = document.createElement('div'); inner.style.padding = '12px 12px 14px';
        const h = document.createElement('h3'); h.style.margin = '0'; h.style.fontSize = '16px'; h.textContent = String(f.title || '(無題)');
        inner.appendChild(h); card.appendChild(inner);
        grid.appendChild(card);
      }
    }

    function renderArticle(item) {
      const art = document.getElementById('feature-article');
      const t = document.getElementById('article-title');
      const s = document.getElementById('article-summary');
      const b = document.getElementById('article-body');
      if (!art || !t || !s || !b) return;
      if (!item) {
        art.hidden = false;
        t.textContent = '記事が見つかりません';
        s.textContent = '';
        b.innerHTML = '';
        return;
      }
      t.textContent = item.title || '';
      s.textContent = item.summary || '';
      b.innerHTML = sanitizeHtml(item.body || '');
      try { initFeatureBuilder(b); } catch {}
      art.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function getParam(name) {
      try { return new URLSearchParams(window.location.search).get(name); } catch { return null; }
    }

    function setParam(name, value) {
      try {
        const url = new URL(location.href);
        if (value) { url.searchParams.set(name, value); }
        else { url.searchParams.delete(name); }
        history.replaceState({}, '', url);
      } catch {}
    }

    function normalize(str) { return String(str || '').toLowerCase(); }

    function matchItem(item, q) {
      if (!q) return true;
      const n = normalize(q);
      const title = normalize(item.title);
      const summary = normalize(item.summary);
      let bodyText = '';
      try {
        const tmp = document.createElement('div');
        tmp.innerHTML = item.body || '';
        bodyText = normalize(tmp.textContent || tmp.innerText || '');
      } catch {}
      return title.includes(n) || summary.includes(n) || bodyText.includes(n);
    }

    function sortItems(items, mode) {
      const arr = items.slice();
      const ja = new Intl.Collator('ja', { sensitivity: 'base', numeric: false });
      switch (mode) {
        case 'old':
          return arr.sort((a, b) => new Date(a.updatedAt || a.createdAt || 0).getTime() - new Date(b.updatedAt || b.createdAt || 0).getTime());
        case 'az':
          return arr.sort((a, b) => ja.compare(a.title || '', b.title || ''));
        case 'za':
          return arr.sort((a, b) => ja.compare(b.title || '', a.title || ''));
        case 'new':
        default:
          return arr.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
      }
    }

    // --- init ---
    let list = loadFeatures().filter(f => (f.status || 'draft') === 'published');
    const id = getParam('id');
    if (id) {
      const item = loadFeatures().find(f => f.id === id);
      if (item) {
        renderArticle(item);
        if (item.status !== 'published') {
          const s = document.getElementById('article-summary');
          if (s) {
            const note = item.status === 'draft' ? '（下書きのプレビュー）' : '（非公開のプレビュー）';
            s.textContent = (s.textContent || '') + note;
          }
        }
      } else {
        renderArticle(null);
      }
    }

    const qInput = document.getElementById('feature-search');
    const countEl = document.getElementById('feature-count');
    const sortSel = document.getElementById('feature-sort');

    const apply = (q, sortMode) => {
      if (qInput && qInput.value !== (q || '')) qInput.value = q || '';
      const filtered = (list.length ? list : []).filter(it => matchItem(it, q));
      const sorted = sortItems(filtered, sortMode || getParam('sort') || 'new');
      renderList(sorted);
      if (countEl) {
        const total = list.length;
        const hit = filtered.length;
        countEl.textContent = q ? `${hit} / ${total} 件` : `${total} 件`;
      }
    };

    const seedAndApply = (q, sortMode) => {
      if (list.length) { apply(q, sortMode); return; }
      fetch('/feature/feature-list.json').then(r => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      }).then(arr => {
        const mapped = Array.isArray(arr) ? arr.map((x) => ({ title: x.title, summary: x.excerpt || '', image: (x.image || '').replace(/^\.\//, '/feature/') })) : [];
        const filtered = mapped.filter(it => matchItem({ ...it, body: '' }, q));
        const sorted = (sortMode || getParam('sort') || 'new') === 'new' || (sortMode || getParam('sort') || 'new') === 'old'
          ? filtered
          : sortItems(filtered, sortMode || getParam('sort') || 'new');
        renderList(sorted);
        if (countEl) {
          const total = mapped.length;
          const hit = filtered.length;
          countEl.textContent = q ? `${hit} / ${total} 件` : `${total} 件`;
        }
      }).catch(() => {
        renderList([]);
        if (countEl) { countEl.textContent = '0 件'; }
      });
    };

    const q0 = getParam('q') || '';
    const s0 = getParam('sort') || 'new';
    seedAndApply(q0, s0);

    if (qInput) {
      qInput.value = q0;
      qInput.addEventListener('input', () => {
        const v = qInput.value.trim();
        setParam('q', v);
        seedAndApply(v, sortSel ? sortSel.value : (getParam('sort') || 'new'));
      });
    }
    if (sortSel) {
      sortSel.value = s0;
      sortSel.addEventListener('change', () => {
        const mode = sortSel.value;
        setParam('sort', mode);
        seedAndApply(qInput ? qInput.value.trim() : (getParam('q') || ''), mode);
      });
    }

    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  return (
    <main className="section">
      <div className="container stack">
        <h1 className="section-title" id="pickup">特集</h1>
        <p className="muted" id="feature-intro">公開中の特集を掲載します。</p>

        {/* 詳細表示 */}
        <article id="feature-article" className="card stack" style={{ padding: '20px' }} hidden>
          <h2 id="article-title" style={{ margin: '0 0 8px' }}></h2>
          <p id="article-summary" className="muted" style={{ margin: '0 0 16px' }}></p>
          <div id="article-body" className="rte-editor" style={{ border: 0, padding: 0 }}></div>
        </article>

        {/* 一覧表示 */}
        <section className="stack">
          <div className="space-between" style={{ display: 'flex', alignItems: 'center' }}>
            <h2 className="section-title" style={{ fontSize: '22px', margin: 0 }}>特集一覧</h2>
          </div>
          <div className="cluster" style={{ gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input id="feature-search" type="search" placeholder="キーワード検索（タイトル・概要・本文）" style={{ maxWidth: '360px' }} />
            <label className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>並び替え</span>
              <select id="feature-sort">
                <option value="new">新しい順</option>
                <option value="old">古い順</option>
                <option value="az">タイトル あ→ん</option>
                <option value="za">タイトル ん→あ</option>
              </select>
            </label>
            <span id="feature-count" className="muted"></span>
          </div>
          <div id="feature-list" className="features-grid"></div>
          <p id="feature-empty" className="muted" hidden>公開中の特集はまだありません。</p>
        </section>
      </div>
    </main>
  );
}
